import hmac
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select
from app.api.bot_commands import handle_callback_query, handle_private_command
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.logging import get_logger
from app.models import BusinessConnection, Conversation, Message
from app.services.ai import sales_ai
from app.services.conversations import get_or_create_conversation, save_message
from app.services.knowledge import knowledge
from app.services.telegram import telegram

logger = get_logger(__name__)
router = APIRouter(tags=["telegram"])


def _date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _clean_channel_username(raw: str) -> str:
    raw = (raw or "").strip()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/", "@"):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
    return raw.strip("/").strip()


async def _store_channel_post(message: dict) -> None:
    chat = message.get("chat", {})
    username = (chat.get("username") or "").lstrip("@")
    configured = _clean_channel_username(settings.telegram_public_channel)
    if not configured or not username or username.lower() != configured.lower():
        return
    text = message.get("text") or message.get("caption") or ""
    photos = message.get("photo") or []
    file_id = photos[-1].get("file_id") if photos else None
    photo_bytes = None
    mime = "image/jpeg"
    if file_id:
        try:
            safe_name = "".join(c for c in username if c.isalnum() or c in "-_" ) or "channel"
            dest = Path(settings.storage_dir) / "incoming_tmp" / f"{safe_name}_{message.get('message_id')}.jpg"
            await telegram.download_photo(file_id, dest)
            photo_bytes = dest.read_bytes()
            dest.unlink(missing_ok=True)
        except Exception:
            logger.exception("Kanal post rasmini yuklab olishda xatolik: post=%s", message.get('message_id'))
            photo_bytes = None
    async with SessionLocal() as db:
        await knowledge.upsert_post(
            db,
            channel_username=username,
            telegram_message_id=int(message["message_id"]),
            text=text,
            posted_at=datetime.fromtimestamp(message["date"], timezone.utc) if message.get("date") else None,
            source_url=f"https://t.me/{username}/{message['message_id']}",
            photo_file_id=file_id,
            photo_bytes=photo_bytes,
            photo_mime_type=mime,
        )
        await db.commit()


async def _handle_business_message(message: dict) -> None:
    connection_id = message.get("business_connection_id")
    chat = message.get("chat", {})
    sender = message.get("from") or {}
    if not connection_id or chat.get("type") != "private":
        return

    async with SessionLocal() as db:
        connection = await db.get(BusinessConnection, connection_id)
        if connection is None or not connection.is_enabled:
            return

        # Messages emitted by this connected business bot carry sender_business_bot.
        # Do not mistake them for a human owner reply.
        if message.get("sender_business_bot") or sender.get("is_bot"):
            return

        # A real account-owner reply means the human has taken over this chat.
        if sender.get("id") and connection.owner_user_id == int(sender["id"]):
            result = await db.execute(select(Conversation).where(
                Conversation.business_connection_id == connection_id,
                Conversation.chat_id == int(chat["id"]),
            ))
            conversation = result.scalar_one_or_none()
            if conversation:
                conversation.status = "human_takeover"
                conversation.handoff_reason = "Admin Telegram chatida javob berdi"
                conversation.last_message_at = datetime.now(timezone.utc)
                await save_message(
                    db,
                    conversation_id=conversation.id,
                    telegram_message_id=int(message["message_id"]),
                    direction="admin",
                    text=message.get("text") or message.get("caption") or "[Admin xabari]",
                )
                await db.commit()
            return

        first_name = sender.get("first_name", "")
        last_name = sender.get("last_name", "")
        customer_name = f"{first_name} {last_name}".strip() or "Mijoz"
        incoming_text = message.get("text") or message.get("caption") or ""
        if not (connection.rights or {}).get("can_reply", False):
            conversation = await get_or_create_conversation(
                db,
                business_connection_id=connection_id,
                chat_id=int(chat["id"]),
                customer_name=customer_name,
                username=sender.get("username"),
            )
            await save_message(
                db,
                conversation_id=conversation.id,
                telegram_message_id=int(message["message_id"]),
                direction="customer",
                text=incoming_text or "[Matn bo'lmagan xabar]",
            )
            conversation.status = "human_takeover"
            conversation.handoff_reason = "Telegram Business ulanishida can_reply huquqi yo'q"
            await db.commit()
            try:
                await telegram.notify_admin(
                    f"⚠️ Business botda can_reply huquqi yo'q\nMijoz: {customer_name}\nChat ID: {chat['id']}"
                )
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (can_reply)")
            return
        conversation = await get_or_create_conversation(
            db,
            business_connection_id=connection_id,
            chat_id=int(chat["id"]),
            customer_name=customer_name,
            username=sender.get("username"),
        )
        incoming_saved = await save_message(
            db,
            conversation_id=conversation.id,
            telegram_message_id=int(message["message_id"]),
            direction="customer",
            text=incoming_text or "[Matn bo'lmagan xabar]",
        )
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.flush()

        if conversation.status == "human_takeover":
            await db.commit()
            return
        if incoming_saved is None:
            # Telegram may retry a webhook. If this incoming message already has a reply,
            # do not send a duplicate. If it does not, continue so a transient failure can retry.
            existing_reply = await db.execute(select(Message.id).where(
                Message.conversation_id == conversation.id,
                Message.reply_to_telegram_message_id == int(message["message_id"]),
            ).limit(1))
            if existing_reply.scalar_one_or_none() is not None:
                await db.commit()
                return
        if not incoming_text.strip():
            conversation.status = "human_takeover"
            conversation.handoff_reason = "Mijoz matn bo'lmagan xabar yubordi; operator tekshirishi kerak"
            await db.commit()
            try:
                await telegram.notify_admin(
                    f"🧑‍💼 Operator kerak\nMijoz: {customer_name}\nChat ID: {chat['id']}\nSabab: matn bo'lmagan xabar"
                )
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (matn bo'lmagan xabar)")
            return

        history_rows = (await db.execute(
            select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).limit(10)
        )).scalars().all()
        history = [{"direction": row.direction, "text": row.text} for row in reversed(history_rows)]
        evidence = await knowledge.search(db, incoming_text, limit=6)
        decision = await sales_ai.answer(incoming_text, evidence, history)

        if decision["handoff"]:
            conversation.status = "human_takeover"
            conversation.handoff_reason = decision.get("reason") or "AI suhbatni operatorga topshirdi"
            # Give the customer a brief acknowledgement before the operator takes over.
            handoff_reply = decision.get("reply") or "Savolingizni mutaxassisimizga yetkazdim. Tez orada javob beramiz."
            try:
                sent = await telegram.send_business_text(connection_id, int(chat["id"]), handoff_reply)
                await save_message(
                    db,
                    conversation_id=conversation.id,
                    telegram_message_id=int(sent["message_id"]),
                    direction="assistant",
                    text=handoff_reply,
                    reply_to_telegram_message_id=int(message["message_id"]),
                )
            except Exception:
                logger.exception("Handoff javobini yuborishda xatolik: conversation=%s", conversation.id)
            await db.commit()
            try:
                await telegram.notify_admin(
                    "🧑‍💼 AI suhbatni operatorga topshirdi\n"
                    f"Mijoz: {customer_name}\nChat ID: {chat['id']}\n"
                    f"Savol: {incoming_text[:700]}\nSabab: {conversation.handoff_reason}"
                )
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (handoff)")
            return

        sent = None
        if decision.get("attach_photo") and decision.get("source_post_id") is not None:
            selected_post = next((post for post in evidence if post.telegram_message_id == decision["source_post_id"]), None)
            if selected_post and (selected_post.photo_file_id or selected_post.image_path):
                try:
                    sent = await telegram.send_business_photo(
                        connection_id,
                        int(chat["id"]),
                        photo_file_id=selected_post.photo_file_id,
                        photo_path=selected_post.image_path,
                        caption=decision["reply"],
                    )
                except Exception:
                    logger.exception("Mahsulot rasmini yuborishda xatolik: post_id=%s", decision.get('source_post_id'))
                    sent = None
        if sent is None:
            sent = await telegram.send_business_text(connection_id, int(chat["id"]), decision["reply"])
        await save_message(
            db,
            conversation_id=conversation.id,
            telegram_message_id=int(sent["message_id"]),
            direction="assistant",
            text=decision["reply"],
            reply_to_telegram_message_id=int(message["message_id"]),
        )
        await db.commit()


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    expected = settings.telegram_webhook_secret
    if not expected or not x_telegram_bot_api_secret_token or not hmac.compare_digest(
        expected, x_telegram_bot_api_secret_token
    ):
        raise HTTPException(status_code=401, detail="Invalid Telegram webhook secret")

    update = await request.json()
    if update.get("business_connection"):
        data = update["business_connection"]
        async with SessionLocal() as db:
            row = await db.get(BusinessConnection, data["id"])
            if row is None:
                row = BusinessConnection(id=data["id"])
                db.add(row)
            row.owner_user_id = (data.get("user") or {}).get("id")
            row.is_enabled = bool(data.get("is_enabled", False))
            row.rights = data.get("rights") or {}
            await db.commit()
    elif update.get("channel_post"):
        await _store_channel_post(update["channel_post"])
    elif update.get("edited_channel_post"):
        await _store_channel_post(update["edited_channel_post"])
    elif update.get("business_message"):
        await _handle_business_message(update["business_message"])
    elif update.get("edited_business_message"):
        # Edited customer messages are saved as context in a future iteration; do not auto-reply twice.
        pass
    elif update.get("message"):
        msg = update["message"]
        chat = msg.get("chat", {})
        if chat.get("type") == "private":
            async with SessionLocal() as db:
                await handle_private_command(msg, db)
    elif update.get("callback_query"):
        cb = update["callback_query"]
        async with SessionLocal() as db:
            await handle_callback_query(cb, db)
    return {"ok": True}
