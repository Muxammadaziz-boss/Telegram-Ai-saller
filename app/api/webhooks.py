import asyncio
from collections import OrderedDict
import hmac
import time
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.bot_commands import handle_callback_query, handle_private_command
from app.core.config import settings
from app.core.db import SessionLocal
from app.core.logging import get_logger
from app.models import BusinessConnection, ConnectedChannel, Conversation, Message, Order, Organization
from app.services import settings_service
from app.services.ai import sales_ai
from app.services.conversations import get_or_create_conversation, save_message
from app.services.knowledge import knowledge
from app.services.telegram import TelegramService, get_telegram_service, telegram

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


_PROCESSED_UPDATES: OrderedDict[int, float] = OrderedDict()
_MAX_PROCESSED_UPDATES = 10000


def is_duplicate_update(update_id: int | None) -> bool:
    """Return True if update_id has already been processed recently (TTL 15 mins)."""
    if update_id is None:
        return False
    now = time.time()
    # Prune updates older than 15 minutes (900 seconds)
    while _PROCESSED_UPDATES and now - next(iter(_PROCESSED_UPDATES.values())) > 900:
        _PROCESSED_UPDATES.popitem(last=False)
    if update_id in _PROCESSED_UPDATES:
        return True
    _PROCESSED_UPDATES[update_id] = now
    if len(_PROCESSED_UPDATES) > _MAX_PROCESSED_UPDATES:
        _PROCESSED_UPDATES.popitem(last=False)
    return False


def _clean_channel_username(raw: str) -> str:
    raw = (raw or "").strip()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/", "@"):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
    return raw.strip("/").strip()


async def _store_channel_post(message: dict) -> None:
    chat = message.get("chat", {})
    username = (chat.get("username") or "").lstrip("@")
    if not username:
        return
    async with SessionLocal() as db:
        active_channels = await settings_service.get_active_channel_usernames(db)
        if not active_channels or username.lower() not in [c.lower() for c in active_channels]:
            return
        chan_row = (await db.execute(select(ConnectedChannel).where(ConnectedChannel.channel_username == username.lower()))).scalar_one_or_none()
        if not chan_row or not chan_row.organization_id:
            return
        org_id = chan_row.organization_id
        org = await db.get(Organization, org_id) if org_id else None
        org_token = org.decrypted_bot_token if org else None
        try:
            tg_svc = get_telegram_service(org_token)
        except Exception:
            tg_svc = telegram

        text = message.get("text") or message.get("caption") or ""
        photos = message.get("photo") or []
        file_id = photos[-1].get("file_id") if photos else None
        photo_bytes = None
        mime = "image/jpeg"
        if file_id and tg_svc:
            try:
                safe_name = "".join(c for c in username if c.isalnum() or c in "-_") or "channel"
                dest = Path(settings.storage_dir) / "incoming_tmp" / f"{safe_name}_{message.get('message_id')}.jpg"
                await tg_svc.download_photo(file_id, dest)
                photo_bytes = dest.read_bytes()
                dest.unlink(missing_ok=True)
            except Exception:
                logger.exception("Kanal post rasmini yuklab olishda xatolik: post=%s", message.get('message_id'))
                photo_bytes = None
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
            organization_id=org_id,
        )
        await db.commit()


async def _typing_loop(chat_id: int, connection_id: str | None, stop_event: asyncio.Event, tg_svc: TelegramService | None = None) -> None:
    svc = tg_svc or telegram
    if not svc:
        return
    while not stop_event.is_set():
        try:
            await svc.send_chat_action(chat_id, "typing", business_connection_id=connection_id)
            await asyncio.wait_for(stop_event.wait(), timeout=4.0)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            pass
        except Exception:
            break


async def _handle_business_message(message: dict) -> None:
    connection_id = message.get("business_connection_id")
    chat = message.get("chat", {})
    sender = message.get("from") or {}
    if not connection_id or chat.get("type") != "private":
        return

    chat_id_int = int(chat["id"])
    msg_id_int = int(message.get("message_id", 0))

    # Real human customer check
    if message.get("sender_business_bot") or sender.get("is_bot"):
        return

    async with SessionLocal() as db:
        connection = await db.get(BusinessConnection, connection_id)
        if connection is None or not connection.is_enabled:
            return

        if not connection.organization_id:
            logger.warning("BusinessConnection without organization_id: id=%s", connection_id)
            return

        org_id = connection.organization_id
        org = await db.get(Organization, org_id) if org_id else None
        org_token = org.decrypted_bot_token if org else None
        try:
            tg_svc = get_telegram_service(org_token)
        except Exception:
            tg_svc = telegram

        # Immediately mark message as READ (turns single checkmark into double checkmark ✓✓)
        # and show typing indicator right away
        if msg_id_int and tg_svc:
            asyncio.create_task(tg_svc.read_business_message(connection_id, chat_id_int, msg_id_int))
            asyncio.create_task(tg_svc.send_chat_action(chat_id_int, "typing", business_connection_id=connection_id))

        # A real account-owner reply means the human has taken over this chat.
        if sender.get("id") and connection.owner_user_id == int(sender["id"]):
            result = await db.execute(select(Conversation).where(
                Conversation.business_connection_id == connection_id,
                Conversation.chat_id == chat_id_int,
            ))
            conversation = result.scalar_one_or_none()
            if conversation:
                conversation.status = "human_takeover"
                conversation.handoff_reason = "Admin Telegram chatida javob berdi"
                conversation.last_message_at = datetime.now(timezone.utc)
                await save_message(
                    db,
                    conversation_id=conversation.id,
                    telegram_message_id=msg_id_int,
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
                chat_id=chat_id_int,
                customer_name=customer_name,
                username=sender.get("username"),
                organization_id=org_id,
            )
            await save_message(
                db,
                conversation_id=conversation.id,
                telegram_message_id=msg_id_int,
                direction="customer",
                text=incoming_text or "[Matn bo'lmagan xabar]",
                organization_id=org_id,
            )
            conversation.status = "human_takeover"
            conversation.handoff_reason = "Telegram Business ulanishida can_reply huquqi yo'q"
            await db.commit()
            try:
                if tg_svc:
                    await tg_svc.notify_admin(
                        f"⚠️ Business botda can_reply huquqi yo'q\nMijoz: {customer_name}\nChat ID: {chat['id']}"
                    )
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (can_reply)")
            return
        conversation = await get_or_create_conversation(
            db,
            business_connection_id=connection_id,
            chat_id=chat_id_int,
            customer_name=customer_name,
            username=sender.get("username"),
            organization_id=org_id,
        )
        incoming_saved = await save_message(
            db,
            conversation_id=conversation.id,
            telegram_message_id=msg_id_int,
            direction="customer",
            text=incoming_text or "[Matn bo'lmagan xabar]",
            organization_id=org_id,
        )
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.flush()

        # Auto-reactivate AI unless explicitly taken over via web admin panel
        if conversation.status == "human_takeover":
            if conversation.handoff_reason == "Admin panel orqali operator qabul qildi" and not sales_ai.is_greeting(incoming_text):
                logger.info("Suhbat web admin panel orqali operator nazoratida: conversation_id=%s", conversation.id)
                await db.commit()
                return
            else:
                conversation.status = "ai_active"
                conversation.handoff_reason = None
                logger.info("AI qayta faollashtirildi: conversation_id=%s", conversation.id)
        if incoming_saved is None:
            # Telegram may retry a webhook. If this incoming message already has a reply,
            # do not send a duplicate. If it does not, continue so a transient failure can retry.
            existing_reply = await db.execute(select(Message.id).where(
                Message.conversation_id == conversation.id,
                Message.reply_to_telegram_message_id == msg_id_int,
            ).limit(1))
            if existing_reply.scalar_one_or_none() is not None:
                await db.commit()
                return
        if not incoming_text.strip():
            conversation.status = "human_takeover"
            conversation.handoff_reason = "Mijoz matn bo'lmagan xabar yubordi; operator tekshirishi kerak"
            await db.commit()
            try:
                if tg_svc:
                    await tg_svc.notify_admin(
                        f"🧑‍💼 Operator kerak\nMijoz: {customer_name}\nChat ID: {chat['id']}\nSabab: matn bo'lmagan xabar"
                    )
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (matn bo'lmagan xabar)")
            return

        history_rows = (await db.execute(
            select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at.desc()).limit(10)
        )).scalars().all()
        history = [{"direction": row.direction, "text": row.text} for row in reversed(history_rows)]

        stop_typing = asyncio.Event()
        typing_task = asyncio.create_task(_typing_loop(chat_id_int, connection_id, stop_typing, tg_svc=tg_svc))
        try:
            if sales_ai.is_greeting(incoming_text):
                evidence = []
                decision = await sales_ai.answer(incoming_text, evidence, history, organization_id=org_id, db=db)
            else:
                evidence = await knowledge.search(db, incoming_text, limit=6, organization_id=org_id)
                decision = await sales_ai.answer(incoming_text, evidence, history, organization_id=org_id, db=db)
        finally:
            stop_typing.set()
            typing_task.cancel()

        if decision["handoff"]:
            conversation.status = "human_takeover"
            conversation.handoff_reason = decision.get("reason") or "AI suhbatni operatorga topshirdi"
            handoff_reply = decision.get("reply") or "Savolingizni mutaxassisimizga yetkazdim. Tez orada javob beramiz."
            try:
                sent = await tg_svc.send_business_text(connection_id, chat_id_int, handoff_reply) if tg_svc else None
                if sent:
                    await save_message(
                        db,
                        conversation_id=conversation.id,
                        telegram_message_id=int(sent["message_id"]),
                        direction="assistant",
                        text=handoff_reply,
                        reply_to_telegram_message_id=msg_id_int,
                        organization_id=org_id,
                    )
            except Exception:
                logger.exception("Handoff javobini yuborishda xatolik: conversation=%s", conversation.id)
            await db.commit()
            try:
                if tg_svc:
                    alert_text = (
                        "🧑‍💼 *AI suhbatni operatorga topshirdi*\n"
                        f"Mijoz: {customer_name}\n"
                        f"Chat ID: `{chat['id']}`\n"
                        f"Savol: {incoming_text[:600]}\n"
                        f"Sabab: {conversation.handoff_reason}"
                    )
                    takeover_markup = {
                        "inline_keyboard": [
                            [{"text": "💬 Suhbatni qabul qilish", "callback_data": f"admin:takeover:{conversation.id}"}]
                        ]
                    }
                    if hasattr(tg_svc, "notify_organization_admins"):
                        await tg_svc.notify_organization_admins(db, org_id, alert_text, reply_markup=takeover_markup)
                    else:
                        await tg_svc.notify_admin(alert_text)
            except Exception:
                logger.exception("Admin bildirishnoma yuborishda xatolik (handoff)")
            return


        # If AI successfully completed an order, save it and alert admin
        if decision.get("order_created") and decision.get("order_data"):
            order_info = decision["order_data"]
            new_order = Order(
                organization_id=org_id,
                conversation_id=conversation.id,
                customer_name=order_info.get("customer_name") or customer_name,
                phone=order_info.get("phone") or "",
                product_summary=order_info.get("product_summary") or "",
                delivery_address=order_info.get("delivery_address") or "",
                status="new",
                notes=order_info.get("notes") or "",
            )
            db.add(new_order)
            await db.flush()

            user_handle = f"@{conversation.username}" if conversation.username else f"ID: {chat.get('id')}"
            address_str = new_order.delivery_address or "Ko'rsatilmadi"
            order_notification = (
                "🔥 *YANGI BUYURTMA QABUL QILINDI!*\n\n"
                f"👤 *Mijoz:* {new_order.customer_name} ({user_handle})\n"
                f"📞 *Telefon:* `{new_order.phone}`\n"
                f"📍 *Manzil:* {address_str}\n"
                f"📦 *Mahsulot:* {new_order.product_summary or 'Muloqotdan qarang'}\n"
            )
            if new_order.notes:
                order_notification += f"💬 *Izoh:* {new_order.notes}\n"
            order_notification += (
                f"💬 *Suhbat ID:* #{conversation.id}\n\n"
                "⚡️ *Iltimos admin, mijoz bilan bog'laning!*"
            )
            try:
                if tg_svc:
                    if hasattr(tg_svc, "notify_organization_admins"):
                        await tg_svc.notify_organization_admins(db, org_id, order_notification)
                    else:
                        await tg_svc.notify_admin(order_notification)
            except Exception:
                logger.exception("Admin'ga buyurtma xabarnomasini yuborishda xatolik")

        sent = None
        if decision.get("attach_photo") and decision.get("source_post_id") is not None:
            selected_post = next((post for post in evidence if post.telegram_message_id == decision["source_post_id"]), None)
            if selected_post and (selected_post.photo_file_id or selected_post.image_path) and tg_svc:
                try:
                    sent = await tg_svc.send_business_photo(
                        connection_id,
                        int(chat["id"]),
                        photo_file_id=selected_post.photo_file_id,
                        photo_path=selected_post.image_path,
                        caption=decision["reply"],
                    )
                except Exception:
                    logger.exception("Mahsulot rasmini yuborishda xatolik: post_id=%s", decision.get('source_post_id'))
                    sent = None
        if sent is None and tg_svc:
            try:
                sent = await tg_svc.send_business_text(connection_id, chat_id_int, decision["reply"])
            except Exception:
                logger.exception("Biznes xabarni yuborishda xatolik: chat_id=%s", chat_id_int)
                sent = None
        if sent:
            await save_message(
                db,
                conversation_id=conversation.id,
                telegram_message_id=int(sent["message_id"]),
                direction="assistant",
                text=decision["reply"],
                reply_to_telegram_message_id=msg_id_int,
            )
            await db.commit()


async def _handle_direct_bot_message(message: dict, db: AsyncSession) -> None:
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    sender = message.get("from") or {}
    text = (message.get("text") or message.get("caption") or "").strip()
    if not chat_id or not text:
        return

    first_name = sender.get("first_name", "")
    last_name = sender.get("last_name", "")
    customer_name = f"{first_name} {last_name}".strip() or "Mijoz"

    chat_id_int = int(chat_id)
    tg_svc = telegram
    try:
        if not tg_svc:
            tg_svc = get_telegram_service()
    except Exception:
        tg_svc = None

    stop_typing = asyncio.Event()
    typing_task = asyncio.create_task(_typing_loop(chat_id_int, None, stop_typing, tg_svc=tg_svc))
    try:
        if sales_ai.is_greeting(text):
            evidence = []
            decision = await sales_ai.answer(text, evidence, [])
        else:
            evidence = await knowledge.search(db, text, limit=6)
            decision = await sales_ai.answer(text, evidence, [])
    finally:
        stop_typing.set()
        typing_task.cancel()

    # If photo requested and available
    sent = None
    if decision.get("attach_photo") and decision.get("source_post_id") is not None and tg_svc:
        selected_post = next((post for post in evidence if post.telegram_message_id == decision["source_post_id"]), None)
        if selected_post and selected_post.photo_file_id:
            try:
                sent = await tg_svc.call("sendPhoto", {
                    "chat_id": chat_id,
                    "photo": selected_post.photo_file_id,
                    "caption": decision["reply"][:1024],
                })
            except Exception:
                sent = None

    if sent is None and tg_svc:
        await tg_svc.send_message(chat_id, decision["reply"])

    # If order was created in direct bot chat, notify admin
    if decision.get("order_created") and decision.get("order_data"):
        order_info = decision["order_data"]
        new_order = Order(
            customer_name=order_info.get("customer_name") or customer_name,
            phone=order_info.get("phone") or "",
            product_summary=order_info.get("product_summary") or "",
            delivery_address=order_info.get("delivery_address") or "",
            status="new",
            notes=f"Telegram bot chatidan (@{sender.get('username') or ''}, ID: {chat_id})",
        )
        db.add(new_order)
        await db.commit()
        order_notification = (
            "🎉 YANGI BUYURTMA (Bot chatidan)!\n\n"
            f"👤 Mijoz: {new_order.customer_name}\n"
            f"📞 Telefon: {new_order.phone or 'Kiritilmadi'}\n"
            f"📍 Manzil: {new_order.delivery_address or 'Kiritilmadi'}\n"
            f"💻 Mahsulot: {new_order.product_summary or 'Aniqlashtirilmoqda'}\n"
            f"💬 Chat: @{sender.get('username') or ''} (ID: {chat_id})\n\n"
            "Iltimos, admin mijoz bilan bog'laning!"
        )
        try:
            if tg_svc:
                await tg_svc.notify_admin(order_notification)
        except Exception:
            pass


@router.post("/telegram/webhook")
@router.post("/telegram/webhook/{org_slug}")
async def telegram_webhook(
    request: Request,
    org_slug: str | None = None,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    # 1. Resolve expected secret (organization-specific or global)
    expected = None
    if org_slug:
        async with SessionLocal() as db:
            org_row = (await db.execute(select(Organization).where(Organization.slug == org_slug))).scalar_one_or_none()
            if org_row and org_row.webhook_secret:
                expected = org_row.webhook_secret
    if not expected:
        expected = settings.telegram_webhook_secret

    # 2. Fail closed in production if secret is not configured
    if settings.is_production and not expected:
        logger.error("TELEGRAM_WEBHOOK_SECRET is not configured in production; failing closed")
        raise HTTPException(
            status_code=500,
            detail="Webhook configuration error in production",
        )

    # 3. Strict webhook secret token validation when secret is configured
    if expected:
        if not x_telegram_bot_api_secret_token:
            logger.warning("Telegram webhook request missing X-Telegram-Bot-Api-Secret-Token header")
            raise HTTPException(
                status_code=401,
                detail="Missing Telegram webhook secret token",
            )
        if not hmac.compare_digest(expected, x_telegram_bot_api_secret_token):
            logger.warning("Telegram webhook request provided invalid secret token")
            raise HTTPException(
                status_code=401,
                detail="Invalid Telegram webhook secret token",
            )

    update = await request.json()
    update_id = update.get("update_id")
    if is_duplicate_update(update_id):
        logger.info("Takroriy update_id chetlab o'tildi: %s", update_id)
        return {"ok": True, "duplicate": True}
    if update.get("business_connection"):
        data = update["business_connection"]
        async with SessionLocal() as db:
            org_id = None
            if org_slug:
                org_row = (await db.execute(select(Organization).where(Organization.slug == org_slug))).scalar_one_or_none()
                if org_row:
                    org_id = org_row.id
            row = await db.get(BusinessConnection, data["id"])
            if row is None:
                row = BusinessConnection(id=data["id"])
                db.add(row)
            if org_id:
                row.organization_id = org_id
            row.owner_user_id = (data.get("user") or {}).get("id")
            row.is_enabled = bool(data.get("is_enabled", False))
            row.rights = data.get("rights") or {}
            await db.commit()
    elif update.get("channel_post"):
        asyncio.create_task(_store_channel_post(update["channel_post"]))
    elif update.get("edited_channel_post"):
        asyncio.create_task(_store_channel_post(update["edited_channel_post"]))
    elif update.get("business_message"):
        asyncio.create_task(_handle_business_message(update["business_message"]))
    elif update.get("edited_business_message"):
        # Edited customer messages are saved as context in a future iteration; do not auto-reply twice.
        pass
    elif update.get("message"):
        msg = update["message"]
        chat = msg.get("chat", {})
        if chat.get("type") == "private":
            asyncio.create_task(_process_private_message(msg))
    elif update.get("callback_query"):
        cb = update["callback_query"]
        async with SessionLocal() as db:
            await handle_callback_query(cb, db)
    return {"ok": True}


async def _process_private_message(msg: dict) -> None:
    try:
        async with SessionLocal() as db:
            handled = await handle_private_command(msg, db)
            if not handled:
                await _handle_direct_bot_message(msg, db)
    except Exception:
        logger.exception("Xususiy xabarni qayta ishlashda xatolik")
