"""Telegram bot command handlers for admin management.

Commands handled:
    /start        — register owner if first time
    /admin        — show admin management menu (inline keyboard)
    /addadmin     — begin the add-admin wizard
    /removeadmin  — begin the remove-admin wizard
    /admins       — list all admins
    /mypermissions— show caller's permissions

Callback queries:
    admin:menu                  — main admin menu
    admin:list                  — list admins
    admin:add:role:<role>       — set role for new admin
    admin:remove:<user_id>      — remove admin
    admin:remove:confirm:<uid>  — confirm removal
    admin:perms:<user_id>       — show permission editor
    admin:toggle:<uid>:<perm>   — toggle a permission
    admin:role:<uid>            — show role picker
    admin:setrole:<uid>:<role>  — set role
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import ALL_PERMISSIONS, PERMISSION_LABELS, VALID_ROLES
from app.models import Admin
from app.services import admin_service, settings_service
from app.services.telegram import telegram

logger = get_logger(__name__)

# Temporary in-memory state for multi-step wizards (per owner chat).
# Key: telegram_user_id, Value: wizard state dict.
_wizard_state: dict[int, dict] = {}


def _is_owner(user_id: int) -> bool:
    return user_id == settings.admin_telegram_id


def _admin_keyboard(admin: Admin) -> list[list[dict]]:
    """Main admin management inline keyboard."""
    buttons = [
        [{"text": "👥 Adminlar ro'yxati", "callback_data": "admin:list"}],
        [{"text": "➕ Admin qo'shish", "callback_data": "admin:add:start"}],
    ]
    if admin.role == "owner":
        buttons.append([{"text": "➖ Admin o'chirish", "callback_data": "admin:remove:start"}])
        buttons.append([{"text": "📢 Ulangan Kanallar", "callback_data": "admin:channels:list"}])
    elif admin_service.has_permission(admin, "can_manage_knowledge"):
        buttons.append([{"text": "📢 Ulangan Kanallar", "callback_data": "admin:channels:list"}])
    buttons.append([
        {"text": "🔐 Mening ruxsatlarim", "callback_data": "admin:mypermissions"},
        {"text": "ℹ️ Yordam", "callback_data": "admin:help"},
    ])
    return buttons


def _perms_keyboard(target: Admin) -> list[list[dict]]:
    """Permission editor inline keyboard for a given admin."""
    rows = []
    for perm in ALL_PERMISSIONS:
        current = target.permissions.get(perm, False)
        icon = "✅" if current else "❌"
        label = PERMISSION_LABELS.get(perm, perm)
        rows.append([{"text": f"{icon} {label}", "callback_data": f"admin:toggle:{target.telegram_user_id}:{perm}"}])
    rows.append([{"text": "🔄 Rolni o'zgartirish", "callback_data": f"admin:role:{target.telegram_user_id}"}])
    rows.append([{"text": "◀️ Orqaga", "callback_data": "admin:list"}])
    return rows


def _role_keyboard(target_user_id: int) -> list[list[dict]]:
    """Role picker keyboard."""
    rows = []
    for role in VALID_ROLES:
        if role == "owner":
            continue
        emoji = "🛡" if role == "admin" else "👤"
        rows.append([{"text": f"{emoji} {role.capitalize()}", "callback_data": f"admin:setrole:{target_user_id}:{role}"}])
    rows.append([{"text": "◀️ Orqaga", "callback_data": f"admin:perms:{target_user_id}"}])
    return rows


def _format_admin_row(a: Admin) -> str:
    role_emoji = {"owner": "👑", "admin": "🛡", "moderator": "👤"}.get(a.role, "❓")
    status = "🟢" if a.is_active else "🔴"
    uname = f" (@{a.username})" if a.username else ""
    return f"{status} {role_emoji} {a.name or 'Nomsiz'}{uname}\n   ID: `{a.telegram_user_id}` | Rol: {a.role}"


# ---------------------------------------------------------------------------
# Public handler — called from webhooks.py
# ---------------------------------------------------------------------------

async def handle_private_command(message: dict, db: AsyncSession) -> bool:
    """Handle a direct /command sent to the bot.

    Returns True if the message was handled (a bot command), False otherwise.
    """
    text = (message.get("text") or "").strip()
    sender = message.get("from") or {}
    user_id = sender.get("id")
    chat_id = message.get("chat", {}).get("id")
    if not user_id or not chat_id:
        return False

    # --- wizard text input (non-command message while wizard is active) ---
    if not text.startswith("/") and user_id in _wizard_state:
        return await _handle_wizard_input(user_id, chat_id, text, db)

    cmd = text.split()[0].split("@")[0].lower()

    if cmd == "/start":
        return await _cmd_start(user_id, chat_id, sender, db)
    if cmd in ("/help", "/yordam"):
        return await _cmd_help(user_id, chat_id, db)
    if cmd == "/admin":
        return await _cmd_admin(user_id, chat_id, db)
    if cmd == "/addadmin":
        return await _cmd_addadmin(user_id, chat_id, db)
    if cmd == "/removeadmin":
        return await _cmd_removeadmin(user_id, chat_id, db)
    if cmd == "/admins":
        return await _cmd_admins(user_id, chat_id, db)
    if cmd == "/mypermissions":
        return await _cmd_mypermissions(user_id, chat_id, db)
    if cmd in ("/channels", "/kanallar"):
        return await _cmd_channels(user_id, chat_id, db)
    if cmd in ("/addchannel", "/ulash"):
        return await _cmd_addchannel(user_id, chat_id, text, db)
    if cmd in ("/delchannel", "/removechannel"):
        return await _cmd_delchannel(user_id, chat_id, text, db)
    if cmd in ("/sync", "/syncchannels"):
        return await _cmd_syncchannels(user_id, chat_id, db)
    if cmd == "/setchannel":
        return await _cmd_addchannel(user_id, chat_id, text, db)
    if cmd == "/channel":
        return await _cmd_channels(user_id, chat_id, db)
    if cmd == "/settings":
        return await _cmd_channels(user_id, chat_id, db)

    return False


async def handle_callback_query(callback_query: dict, db: AsyncSession) -> None:
    """Handle inline keyboard button presses for admin management."""
    data = callback_query.get("data", "")
    sender = callback_query.get("from") or {}
    user_id = sender.get("id")
    callback_id = callback_query.get("id")
    chat_id = callback_query.get("message", {}).get("chat", {}).get("id")
    message_id = callback_query.get("message", {}).get("message_id")

    if not user_id or not chat_id or not data.startswith("admin:"):
        return

    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if admin is None and not _is_owner(user_id):
        await telegram.answer_callback(callback_id, "⛔ Sizda admin huquqi yo'q")
        return

    # Ensure owner is in DB.
    if _is_owner(user_id) and admin is None:
        admin = await admin_service.ensure_owner(db)
        await db.commit()

    try:
        if data == "admin:menu":
            await _edit_message(chat_id, message_id,
                                "🔧 *Admin boshqaruvi*\nQuyidagi amallardan birini tanlang:",
                                _admin_keyboard(admin))

        elif data == "admin:list":
            admins = await admin_service.list_admins(db)
            lines = ["👥 *Adminlar ro'yxati:*\n"]
            for a in admins:
                lines.append(_format_admin_row(a))
            keyboard = []
            for a in admins:
                if a.role != "owner":
                    keyboard.append([{"text": f"⚙️ {a.name or a.telegram_user_id}", "callback_data": f"admin:perms:{a.telegram_user_id}"}])
            keyboard.append([{"text": "◀️ Orqaga", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id, "\n".join(lines), keyboard)

        elif data == "admin:add:start":
            if not admin_service.has_permission(admin, "can_manage_admins") and not _is_owner(user_id):
                await telegram.answer_callback(callback_id, "⛔ Admin qo'shish huquqi yo'q")
                return
            _wizard_state[user_id] = {"step": "awaiting_id", "chat_id": chat_id}
            await _edit_message(chat_id, message_id,
                                "➕ *Yangi admin qo'shish*\n\nAdmin qilinadigan foydalanuvchining Telegram ID raqamini yuboring:",
                                [[{"text": "❌ Bekor qilish", "callback_data": "admin:menu"}]])

        elif data.startswith("admin:add:role:"):
            role = data.split(":")[-1]
            state = _wizard_state.get(user_id)
            if not state or state.get("step") != "awaiting_role":
                await telegram.answer_callback(callback_id, "Wizard holati topilmadi")
                return
            target_id = state["target_id"]
            target_name = state.get("target_name", "")
            try:
                new_admin = await admin_service.add_admin(
                    db,
                    telegram_user_id=target_id,
                    name=target_name,
                    role=role,
                    added_by=user_id,
                )
                await db.commit()
                _wizard_state.pop(user_id, None)
                await _edit_message(chat_id, message_id,
                                    f"✅ Admin qo'shildi!\n\n"
                                    f"👤 Ismi: {new_admin.name or 'Nomsiz'}\n"
                                    f"🆔 ID: `{new_admin.telegram_user_id}`\n"
                                    f"🛡 Rol: {new_admin.role}",
                                    [[{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}]])
            except ValueError as exc:
                await _edit_message(chat_id, message_id,
                                    f"❌ Xatolik: {exc}",
                                    [[{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}]])
                _wizard_state.pop(user_id, None)

        elif data == "admin:remove:start":
            if not _is_owner(user_id):
                await telegram.answer_callback(callback_id, "⛔ Faqat owner admin o'chira oladi")
                return
            admins = await admin_service.list_admins(db)
            removable = [a for a in admins if a.role != "owner" and a.is_active]
            if not removable:
                await _edit_message(chat_id, message_id,
                                    "ℹ️ O'chiriladigan admin yo'q.",
                                    [[{"text": "◀️ Orqaga", "callback_data": "admin:menu"}]])
                return
            keyboard = []
            for a in removable:
                keyboard.append([{"text": f"🗑 {a.name or a.telegram_user_id} ({a.role})", "callback_data": f"admin:remove:{a.telegram_user_id}"}])
            keyboard.append([{"text": "◀️ Orqaga", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id,
                                "➖ *Admin o'chirish*\nQaysi adminni o'chirmoqchisiz?",
                                keyboard)

        elif data.startswith("admin:remove:confirm:"):
            target_id = int(data.split(":")[-1])
            try:
                removed = await admin_service.remove_admin(db, target_id)
                await db.commit()
                await _edit_message(chat_id, message_id,
                                    f"✅ {removed.name or removed.telegram_user_id} adminlikdan o'chirildi.",
                                    [[{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}]])
            except ValueError as exc:
                await _edit_message(chat_id, message_id,
                                    f"❌ Xatolik: {exc}",
                                    [[{"text": "◀️ Orqaga", "callback_data": "admin:menu"}]])

        elif data.startswith("admin:remove:") and not data.startswith("admin:remove:confirm:") and not data.endswith(":start"):
            target_id = int(data.split(":")[-1])
            target = await admin_service.get_admin_by_telegram_id(db, target_id)
            name = target.name if target else str(target_id)
            await _edit_message(chat_id, message_id,
                                f"❗ *{name}* adminlikdan olib tashlansinmi?",
                                [
                                    [{"text": "✅ Ha, o'chirish", "callback_data": f"admin:remove:confirm:{target_id}"}],
                                    [{"text": "❌ Yo'q, bekor qilish", "callback_data": "admin:menu"}],
                                ])

        elif data.startswith("admin:perms:"):
            target_id = int(data.split(":")[-1])
            target = await admin_service.get_admin_by_telegram_id(db, target_id)
            if target is None:
                await telegram.answer_callback(callback_id, "Admin topilmadi")
                return
            await _edit_message(chat_id, message_id,
                                f"⚙️ *{target.name or target.telegram_user_id}* ruxsatlari\n"
                                f"Rol: {target.role}\n\nRuxsatni o'zgartirish uchun bosing:",
                                _perms_keyboard(target))

        elif data.startswith("admin:toggle:"):
            parts = data.split(":")
            target_id = int(parts[2])
            perm = parts[3]
            if not _is_owner(user_id) and not admin_service.has_permission(admin, "can_manage_admins"):
                await telegram.answer_callback(callback_id, "⛔ Ruxsatlarni o'zgartirish huquqi yo'q")
                return
            target = await admin_service.get_admin_by_telegram_id(db, target_id)
            if target is None:
                await telegram.answer_callback(callback_id, "Admin topilmadi")
                return
            new_value = not target.permissions.get(perm, False)
            try:
                updated = await admin_service.update_permission(db, target_id, perm, new_value)
                await db.commit()
                await _edit_message(chat_id, message_id,
                                    f"⚙️ *{updated.name or updated.telegram_user_id}* ruxsatlari\n"
                                    f"Rol: {updated.role}\n\nRuxsatni o'zgartirish uchun bosing:",
                                    _perms_keyboard(updated))
                await telegram.answer_callback(callback_id, f"{'✅' if new_value else '❌'} {PERMISSION_LABELS.get(perm, perm)}")
            except ValueError as exc:
                await telegram.answer_callback(callback_id, f"Xatolik: {exc}")

        elif data.startswith("admin:role:") and not data.startswith("admin:setrole:"):
            target_id = int(data.split(":")[-1])
            await _edit_message(chat_id, message_id,
                                f"🔄 *Rol tanlang:*\nFoydalanuvchi ID: `{target_id}`",
                                _role_keyboard(target_id))

        elif data.startswith("admin:setrole:"):
            parts = data.split(":")
            target_id = int(parts[2])
            new_role = parts[3]
            if not _is_owner(user_id):
                await telegram.answer_callback(callback_id, "⛔ Faqat owner rol o'zgartira oladi")
                return
            try:
                updated = await admin_service.update_role(db, target_id, new_role)
                await db.commit()
                await _edit_message(chat_id, message_id,
                                    f"✅ Rol yangilandi!\n{updated.name or updated.telegram_user_id}: *{updated.role}*\n\n"
                                    f"Ruxsatlar rol standartiga qaytarildi.",
                                    [[{"text": "⚙️ Ruxsatlarni sozlash", "callback_data": f"admin:perms:{target_id}"}],
                                     [{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}]])
            except ValueError as exc:
                await telegram.answer_callback(callback_id, f"Xatolik: {exc}")

        elif data in ("admin:settings", "admin:channels:list"):
            channels = await settings_service.list_channels(db)
            lines = [
                "📢 *Ulangan Telegram Kanallar*\n",
                f"Jami kanallar: *{len(channels)} ta*",
                "Har bir kanal postlari avtomatik ravishda AI bilim bazasiga qo'shiladi:\n",
            ]
            keyboard = []
            if not channels:
                lines.append("_(Hozircha hech qanday kanal ulanmagan)_")
            else:
                for ch in channels:
                    sync_time = ch.last_synced_at.strftime("%d.%m %H:%M") if ch.last_synced_at else "sinxronlanmagan"
                    lines.append(f"• `@{ch.channel_username}` — 📦 {ch.posts_count} ta post ({sync_time})")
                    keyboard.append([
                        {"text": f"🔄 Sinxron: @{ch.channel_username}", "callback_data": f"admin:channels:sync:{ch.channel_username}"},
                        {"text": f"🗑 O'chirish", "callback_data": f"admin:channels:del:{ch.channel_username}"},
                    ])
            keyboard.append([{"text": "➕ Yangi kanal ulash", "callback_data": "admin:channels:add"}])
            if channels:
                keyboard.append([{"text": "🔄 Barcha kanallarni sinxronlash", "callback_data": "admin:channels:syncall"}])
            keyboard.append([{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id, "\n".join(lines), keyboard)

        elif data in ("admin:set:channel", "admin:channels:add"):
            if not _is_owner(user_id) and not admin_service.has_permission(admin, "can_manage_knowledge"):
                await telegram.answer_callback(callback_id, "⛔ Kanal qo'shish huquqi yo'q")
                return
            _wizard_state[user_id] = {"step": "awaiting_channel", "chat_id": chat_id}
            await _edit_message(
                chat_id,
                message_id,
                "📢 *Yangi kanal ulash*\n\n"
                "Telegram kanal havolasini yoki username'ini yuboring:\n"
                "(Masalan: `@yangi_kanal` yoki `https://t.me/yangi_kanal`)\n\n"
                "Yuborishingiz bilan kanal postlari avtomatik tahlil qilinib bazaga qo'shiladi.\n\n"
                "Bekor qilish uchun pastdagi tugmani bosing:",
                [[{"text": "❌ Bekor qilish", "callback_data": "admin:channels:list"}]]
            )

        elif data.startswith("admin:channels:sync:"):
            target_ch = data[len("admin:channels:sync:"):]
            await telegram.answer_callback(callback_id, f"@{target_ch} sinxronlanmoqda...")
            from app.services.knowledge import knowledge
            cnt = await knowledge.sync_channel_posts(db, target_ch)
            await db.commit()
            channels = await settings_service.list_channels(db)
            lines = [
                f"✅ `@{target_ch}` muvaffaqiyatli sinxronlandi ({cnt} ta post)!\n",
                "📢 *Ulangan Telegram Kanallar:*\n",
            ]
            keyboard = []
            for ch in channels:
                sync_time = ch.last_synced_at.strftime("%d.%m %H:%M") if ch.last_synced_at else "sinxronlanmagan"
                lines.append(f"• `@{ch.channel_username}` — 📦 {ch.posts_count} ta post ({sync_time})")
                keyboard.append([
                    {"text": f"🔄 Sinxron: @{ch.channel_username}", "callback_data": f"admin:channels:sync:{ch.channel_username}"},
                    {"text": f"🗑 O'chirish", "callback_data": f"admin:channels:del:{ch.channel_username}"},
                ])
            keyboard.append([{"text": "➕ Yangi kanal ulash", "callback_data": "admin:channels:add"}])
            keyboard.append([{"text": "🔄 Barcha kanallarni sinxronlash", "callback_data": "admin:channels:syncall"}])
            keyboard.append([{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id, "\n".join(lines), keyboard)

        elif data == "admin:channels:syncall":
            await telegram.answer_callback(callback_id, "Barcha kanallar sinxronlanmoqda...")
            from app.services.knowledge import knowledge
            results = await knowledge.sync_all_channels(db)
            await db.commit()
            total = sum(results.values())
            channels = await settings_service.list_channels(db)
            lines = [
                f"✅ Jami *{total} ta post* sinxronlandi!\n",
                "📢 *Ulangan Telegram Kanallar:*\n",
            ]
            keyboard = []
            for ch in channels:
                sync_time = ch.last_synced_at.strftime("%d.%m %H:%M") if ch.last_synced_at else "sinxronlanmagan"
                lines.append(f"• `@{ch.channel_username}` — 📦 {ch.posts_count} ta post ({sync_time})")
                keyboard.append([
                    {"text": f"🔄 Sinxron: @{ch.channel_username}", "callback_data": f"admin:channels:sync:{ch.channel_username}"},
                    {"text": f"🗑 O'chirish", "callback_data": f"admin:channels:del:{ch.channel_username}"},
                ])
            keyboard.append([{"text": "➕ Yangi kanal ulash", "callback_data": "admin:channels:add"}])
            keyboard.append([{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id, "\n".join(lines), keyboard)

        elif data.startswith("admin:channels:del:"):
            target_ch = data[len("admin:channels:del:"):]
            keyboard = [
                [{"text": f"⚠️ Ha, @{target_ch} o'chirilsin", "callback_data": f"admin:channels:confirm_del:{target_ch}"}],
                [{"text": "❌ Bekor qilish", "callback_data": "admin:channels:list"}],
            ]
            await _edit_message(
                chat_id,
                message_id,
                f"🗑 *Kanalni o'chirish*\n\n`@{target_ch}` kanali bazadan olib tashlansinmi?",
                keyboard,
            )

        elif data.startswith("admin:channels:confirm_del:"):
            target_ch = data[len("admin:channels:confirm_del:"):]
            await settings_service.remove_channel(db, target_ch)
            await db.commit()
            channels = await settings_service.list_channels(db)
            lines = [
                f"🗑 `@{target_ch}` kanali muvaffaqiyatli o'chirildi.\n",
                "📢 *Ulangan Telegram Kanallar:*\n",
            ]
            keyboard = []
            for ch in channels:
                sync_time = ch.last_synced_at.strftime("%d.%m %H:%M") if ch.last_synced_at else "sinxronlanmagan"
                lines.append(f"• `@{ch.channel_username}` — 📦 {ch.posts_count} ta post ({sync_time})")
                keyboard.append([
                    {"text": f"🔄 Sinxron: @{ch.channel_username}", "callback_data": f"admin:channels:sync:{ch.channel_username}"},
                    {"text": f"🗑 O'chirish", "callback_data": f"admin:channels:del:{ch.channel_username}"},
                ])
            keyboard.append([{"text": "➕ Yangi kanal ulash", "callback_data": "admin:channels:add"}])
            if channels:
                keyboard.append([{"text": "🔄 Barcha kanallarni sinxronlash", "callback_data": "admin:channels:syncall"}])
            keyboard.append([{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}])
            await _edit_message(chat_id, message_id, "\n".join(lines), keyboard)

        elif data == "admin:mypermissions":
            lines = [f"🔐 *Sizning ruxsatlaringiz*\nRol: {admin.role}\n"]
            for perm in ALL_PERMISSIONS:
                icon = "✅" if admin_service.has_permission(admin, perm) else "❌"
                label = PERMISSION_LABELS.get(perm, perm)
                lines.append(f"{icon} {label}")
            await _edit_message(chat_id, message_id, "\n".join(lines),
                                [[{"text": "◀️ Orqaga", "callback_data": "admin:menu"}]])

        elif data == "admin:help":
            help_message = _help_text(is_admin_user=True, is_owner_user=_is_owner(user_id))
            keyboard = [[{"text": "◀️ Orqaga", "callback_data": "admin:menu"}]]
            await _edit_message(chat_id, message_id, help_message, keyboard)

    except Exception:
        logger.exception("Admin callback xatolik: data=%s, user=%s", data, user_id)
        await telegram.answer_callback(callback_id, "⚠️ Ichki xatolik yuz berdi")

    # Always answer the callback to clear the loading spinner.
    try:
        await telegram.answer_callback(callback_id)
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def _cmd_start(user_id: int, chat_id: int, sender: dict, db: AsyncSession) -> bool:
    if _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        admin.name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip() or admin.name
        admin.username = sender.get("username") or admin.username
        await db.commit()
        await telegram.call("sendMessage", {
            "chat_id": chat_id,
            "text": (
                "👑 Assalomu alaykum, owner!\n\n"
                "Bot boshqaruv paneli tayyor.\n"
                "• /admin — Admin boshqaruvi\n"
                "• /help — Barcha buyruqlar va yordam\n"
                "• /channels — Ulangan kanallar"
            ),
            "parse_mode": "Markdown",
        })
        return True

    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if admin:
        admin.name = f"{sender.get('first_name', '')} {sender.get('last_name', '')}".strip() or admin.name
        admin.username = sender.get("username") or admin.username
        await db.commit()
        await telegram.call("sendMessage", {
            "chat_id": chat_id,
            "text": (
                f"Assalomu alaykum, {admin.name}!\n\n"
                f"Siz *{admin.role}* sifatida ro'yxatdansiz.\n"
                "• /admin — Admin boshqaruvi\n"
                "• /help — Barcha buyruqlar va yordam\n"
                "• /mypermissions — Ruxsatlarim"
            ),
            "parse_mode": "Markdown",
        })
        return True

    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": (
            "Assalomu alaykum! Men do'konimizning AI savdo yordamchisiman.\n\n"
            "Menga qiziqtirgan mahsulotingiz haqida yozishingiz mumkin.\n"
            "Yo'riqnoma uchun: /help"
        ),
    })
    return True


async def _cmd_admin(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Sizda admin huquqi yo'q."})
        return True
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "🔧 *Admin boshqaruvi*\nQuyidagi amallardan birini tanlang:",
        "parse_mode": "Markdown",
        "reply_markup": {"inline_keyboard": _admin_keyboard(admin)},
    })
    return True


async def _cmd_addadmin(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin or (not admin_service.has_permission(admin, "can_manage_admins") and not _is_owner(user_id)):
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Admin qo'shish huquqi yo'q."})
        return True
    _wizard_state[user_id] = {"step": "awaiting_id", "chat_id": chat_id}
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "➕ *Yangi admin qo'shish*\n\nAdmin qilinadigan foydalanuvchining Telegram ID raqamini yuboring:\n\n(Bekor qilish uchun /admin bosing)",
        "parse_mode": "Markdown",
    })
    return True


async def _cmd_removeadmin(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    if not _is_owner(user_id):
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Faqat owner admin o'chira oladi."})
        return True
    admins = await admin_service.list_admins(db)
    removable = [a for a in admins if a.role != "owner" and a.is_active]
    if not removable:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "ℹ️ O'chiriladigan admin yo'q."})
        return True
    keyboard = []
    for a in removable:
        keyboard.append([{"text": f"🗑 {a.name or a.telegram_user_id} ({a.role})", "callback_data": f"admin:remove:{a.telegram_user_id}"}])
    keyboard.append([{"text": "❌ Bekor qilish", "callback_data": "admin:menu"}])
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "➖ *Admin o'chirish*\nQaysi adminni o'chirmoqchisiz?",
        "parse_mode": "Markdown",
        "reply_markup": {"inline_keyboard": keyboard},
    })
    return True


async def _cmd_admins(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Sizda admin huquqi yo'q."})
        return True
    admins = await admin_service.list_admins(db)
    lines = ["👥 *Adminlar ro'yxati:*\n"]
    for a in admins:
        lines.append(_format_admin_row(a))
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "\n".join(lines),
        "parse_mode": "Markdown",
    })
    return True


async def _cmd_mypermissions(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Sizda admin huquqi yo'q."})
        return True
    lines = [f"🔐 *Sizning ruxsatlaringiz*\nRol: {admin.role}\n"]
    for perm in ALL_PERMISSIONS:
        icon = "✅" if admin_service.has_permission(admin, perm) else "❌"
        label = PERMISSION_LABELS.get(perm, perm)
        lines.append(f"{icon} {label}")
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "\n".join(lines),
        "parse_mode": "Markdown",
    })
    return True


async def _cmd_channels(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin:
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Sizda admin huquqi yo'q."})
        return True
    channels = await settings_service.list_channels(db)
    lines = [
        "📢 *Ulangan Telegram Kanallar:*\n",
        f"Jami kanallar: *{len(channels)} ta*",
        "Kanal postlari avtomatik ravishda AI bilim bazasiga qo'shiladi.\n",
    ]
    keyboard = []
    if not channels:
        lines.append("_(Hozircha hech qanday kanal ulanmagan)_\nKanal qo'shish uchun: `/addchannel <link>`")
    else:
        for ch in channels:
            sync_time = ch.last_synced_at.strftime("%d.%m %H:%M") if ch.last_synced_at else "sinxronlanmagan"
            lines.append(f"• `@{ch.channel_username}` — 📦 {ch.posts_count} ta post ({sync_time})")
            keyboard.append([
                {"text": f"🔄 @{ch.channel_username}", "callback_data": f"admin:channels:sync:{ch.channel_username}"},
                {"text": "🗑 O'chirish", "callback_data": f"admin:channels:del:{ch.channel_username}"},
            ])
    keyboard.append([{"text": "➕ Yangi kanal ulash", "callback_data": "admin:channels:add"}])
    if channels:
        keyboard.append([{"text": "🔄 Barchasini sinxronlash", "callback_data": "admin:channels:syncall"}])
    keyboard.append([{"text": "◀️ Admin menyu", "callback_data": "admin:menu"}])
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "\n".join(lines),
        "parse_mode": "Markdown",
        "reply_markup": {"inline_keyboard": keyboard},
    })
    return True


async def _cmd_addchannel(user_id: int, chat_id: int, text: str, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin or (admin.role != "owner" and not admin_service.has_permission(admin, "can_manage_knowledge")):
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Kanal ulash huquqi yo'q."})
        return True
    parts = text.split(maxsplit=1)
    if len(parts) > 1 and parts[1].strip():
        new_val = parts[1].strip()
        try:
            from app.services.knowledge import knowledge
            ch = await settings_service.add_channel(db, new_val, added_by=user_id)
            imported = await knowledge.sync_channel_posts(db, ch.channel_username)
            await db.commit()
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": f"✅ Yangi kanal ulandi va sinxronlandi!\n\n📢 Kanal: `@{ch.channel_username}`\n📦 Sinxronlangan postlar: *{imported} ta*",
                "parse_mode": "Markdown",
            })
            return True
        except ValueError as exc:
            await telegram.call("sendMessage", {"chat_id": chat_id, "text": f"❌ Xatolik: {exc}"})
            return True
    _wizard_state[user_id] = {"step": "awaiting_channel", "chat_id": chat_id}
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "📢 *Yangi kanal ulash*\n\nTelegram kanal username yoki havolasini yuboring:\n(Masalan: `@yangi_kanal` yoki `https://t.me/yangi_kanal`)",
        "parse_mode": "Markdown",
    })
    return True


async def _cmd_delchannel(user_id: int, chat_id: int, text: str, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin or (admin.role != "owner" and not admin_service.has_permission(admin, "can_manage_knowledge")):
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Kanalni o'chirish huquqi yo'q."})
        return True
    parts = text.split(maxsplit=1)
    if len(parts) > 1 and parts[1].strip():
        ch_name = parts[1].strip()
        removed = await settings_service.remove_channel(db, ch_name)
        await db.commit()
        if removed:
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": f"🗑 `@{settings_service.clean_channel_username(ch_name)}` kanali o'chirildi.",
                "parse_mode": "Markdown",
            })
        else:
            await telegram.call("sendMessage", {"chat_id": chat_id, "text": f"❌ `{ch_name}` kanali topilmadi."})
        return True
    return await _cmd_channels(user_id, chat_id, db)


async def _cmd_syncchannels(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()
    if not admin or (admin.role != "owner" and not admin_service.has_permission(admin, "can_manage_knowledge")):
        await telegram.call("sendMessage", {"chat_id": chat_id, "text": "⛔ Sinxronlash huquqi yo'q."})
        return True
    from app.services.knowledge import knowledge
    await telegram.call("sendMessage", {"chat_id": chat_id, "text": "🔄 Kanallar sinxronlanmoqda, kuting..."})
    results = await knowledge.sync_all_channels(db)
    await db.commit()
    total = sum(results.values())
    lines = [f"✅ Sinxronlash yakunlandi! Jami: *{total} ta post*.\n"]
    for ch, cnt in results.items():
        lines.append(f"• `@{ch}`: {cnt} ta post")
    await telegram.call("sendMessage", {
        "chat_id": chat_id,
        "text": "\n".join(lines),
        "parse_mode": "Markdown",
    })
    return True


def _help_text(is_admin_user: bool, is_owner_user: bool) -> str:
    if is_admin_user:
        lines = [
            "ℹ️ *AI Sales Agent — Bot Buyruqlari va Yordam*",
            "",
            "👑 *Asosiy boshqaruv:*",
            "• `/admin` — Asosiy admin menyusi va boshqaruv paneli",
            "• `/help` yoki `/yordam` — Barcha buyruqlar va yo'riqnoma",
            "• `/mypermissions` — Shaxsiy ruxsatlaringizni ko'rish",
            "",
            "📢 *Telegram Kanallar boshqaruvi (Multi-channel):*",
            "• `/channels` yoki `/kanallar` — Ulangan kanallar ro'yxati va holati",
            "• `/addchannel <link>` — Yangi kanal ulash (masalan: `/addchannel @kanal_nomi`)",
            "• `/delchannel <username>` — Ulangan kanalni o'chirish",
            "• `/sync` — Barcha kanallardagi yangi postlarni bazaga sinxronlash",
            "",
            "👥 *Adminlar boshqaruvi:*",
            "• `/admins` — Faol admin va moderatorlar ro'yxati",
        ]
        if is_owner_user:
            lines.extend([
                "• `/addadmin` — Yangi admin yoki moderator qo'shish",
                "• `/removeadmin` — Adminni olib tashlash",
            ])
        lines.extend([
            "",
            "🌐 *Web Dashboard:*",
            "• Web panel: `http://localhost:3000`",
            "• Analitika, suhbatlar, buyurtmalar va mahsulotlar boshqaruvi.",
            "",
            "💡 *Maslahat:* Har qanday kanal ulanganda, bot uning postlarini avtomatik o'qib, AI bilim bazasiga joylaydi.",
        ])
        return "\n".join(lines)
    else:
        return (
            "🤖 *AI Savdo Yordamchisi — Yordam*\n\n"
            "Assalomu alaykum! Men do'konimiz mahsulotlari bo'yicha maslahat beruvchi va buyurtma qabul qiluvchi aqlli yordamchiman.\n\n"
            "📌 *Qanday savollar berishingiz mumkin?*\n"
            "• Mahsulot narxi, o'lchami, sifati yoki xususiyatlari haqida;\n"
            "• Mahsulot rasmini yuborib mavjudligi haqida ma'lumot olish;\n"
            "• Buyurtma berish uchun manzilingiz va telefoningizni qoldirish.\n\n"
            "📞 *Operator bilan bog'lanish:*\n"
            "Agar xodimlarimiz bilan to'g'ridan-to'g'ri bog'lanmoqchi bo'lsangiz, xabaringizda "
            "*operator* yoki *admin* so'zini yozing."
        )


async def _cmd_help(user_id: int, chat_id: int, db: AsyncSession) -> bool:
    admin = await admin_service.get_admin_by_telegram_id(db, user_id)
    if not admin and _is_owner(user_id):
        admin = await admin_service.ensure_owner(db)
        await db.commit()

    is_adm = admin is not None
    is_own = _is_owner(user_id) or (admin is not None and admin.role == "owner")

    text = _help_text(is_admin_user=is_adm, is_owner_user=is_own)
    keyboard = []
    if is_adm:
        keyboard.append([{"text": "🔧 Admin menyu", "callback_data": "admin:menu"}])
        keyboard.append([{"text": "📢 Ulangan kanallar", "callback_data": "admin:channels:list"}])
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
    }
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    await telegram.call("sendMessage", payload)
    return True


# ---------------------------------------------------------------------------
# Wizard input handler
# ---------------------------------------------------------------------------

async def _handle_wizard_input(user_id: int, chat_id: int, text: str, db: AsyncSession) -> bool:
    """Handle text input during an active wizard (e.g. add-admin, set-channel)."""
    state = _wizard_state.get(user_id)
    if not state:
        return False

    if state.get("step") == "awaiting_channel":
        if text.startswith("/"):
            _wizard_state.pop(user_id, None)
            return False
        try:
            from app.services.knowledge import knowledge
            ch = await settings_service.add_channel(db, text, added_by=user_id)
            imported = await knowledge.sync_channel_posts(db, ch.channel_username)
            await db.commit()
            _wizard_state.pop(user_id, None)
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": (
                    f"✅ Yangi kanal ulandi va sinxronlandi!\n\n"
                    f"📢 Kanal: `@{ch.channel_username}`\n"
                    f"📦 Yuklangan postlar: *{imported} ta*\n\n"
                    f"Barcha ulangan kanallar ro'yxati: /channels"
                ),
                "parse_mode": "Markdown",
            })
            return True
        except ValueError as exc:
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": f"❌ Xatolik: {exc}. Qaytadan kiriting:",
            })
            return True

    if state.get("step") == "awaiting_id":
        # Cancel if user typed a command.
        if text.startswith("/"):
            _wizard_state.pop(user_id, None)
            return False

        try:
            target_id = int(text.strip())
        except ValueError:
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": "❌ Telegram ID faqat raqam bo'lishi kerak. Qaytadan yuboring:",
            })
            return True

        if target_id == settings.admin_telegram_id:
            await telegram.call("sendMessage", {
                "chat_id": chat_id,
                "text": "ℹ️ Bu owner ID — allaqachon admin.",
            })
            _wizard_state.pop(user_id, None)
            return True

        state["step"] = "awaiting_role"
        state["target_id"] = target_id
        state["target_name"] = text.strip()

        keyboard = [[{"text": f"🛡 Admin", "callback_data": "admin:add:role:admin"}],
                     [{"text": f"👤 Moderator", "callback_data": "admin:add:role:moderator"}],
                     [{"text": "❌ Bekor qilish", "callback_data": "admin:menu"}]]
        await telegram.call("sendMessage", {
            "chat_id": chat_id,
            "text": f"👤 Foydalanuvchi ID: `{target_id}`\n\nRol tanlang:",
            "parse_mode": "Markdown",
            "reply_markup": {"inline_keyboard": keyboard},
        })
        return True

    return False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _edit_message(chat_id: int, message_id: int, text: str, keyboard: list[list[dict]] | None = None) -> None:
    """Edit an existing message with optional inline keyboard."""
    payload: dict = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "Markdown",
    }
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    try:
        await telegram.call("editMessageText", payload)
    except Exception:
        logger.exception("editMessageText xatolik: chat=%s, msg=%s", chat_id, message_id)
