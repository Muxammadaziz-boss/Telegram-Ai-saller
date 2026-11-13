from pathlib import Path
import httpx
from app.core.config import settings


class TelegramAPIError(RuntimeError):
    pass


class TelegramService:
    def __init__(self, bot_token: str | None = None) -> None:
        token = bot_token or settings.telegram_bot_token
        if not token:
            raise TelegramAPIError("TELEGRAM_BOT_TOKEN sozlanmagan")
        self.bot_token = token
        self.base_url = f"https://api.telegram.org/bot{token}"
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return self._client

    async def call(self, method: str, payload: dict) -> dict:
        client = self._get_client()
        response = await client.post(f"{self.base_url}/{method}", json=payload)
        try:
            result = response.json()
        except Exception:
            response.raise_for_status()
            raise TelegramAPIError(f"Telegram {method} xatosi: HTTP {response.status_code}")

        if not response.is_success or not result.get("ok"):
            err_desc = result.get("description", f"Telegram {method} xatosi (HTTP {response.status_code})")
            raise TelegramAPIError(err_desc)
        return result.get("result", {})

    async def get_me(self) -> dict:
        """Fetch bot identity details from Telegram API."""
        return await self.call("getMe", {})

    async def set_webhook(
        self,
        url: str,
        secret_token: str | None = None,
        drop_pending_updates: bool = False,
    ) -> dict:
        """Register Telegram webhook with secret token and specified allowed updates."""
        payload: dict = {
            "url": url,
            "allowed_updates": [
                "message",
                "callback_query",
                "business_connection",
                "business_message",
                "edited_business_message",
                "channel_post",
                "edited_channel_post",
            ],
            "drop_pending_updates": drop_pending_updates,
        }
        if secret_token:
            payload["secret_token"] = secret_token
        return await self.call("setWebhook", payload)

    async def get_webhook_info(self) -> dict:
        """Fetch current webhook status from Telegram API."""
        return await self.call("getWebhookInfo", {})

    async def delete_webhook(self, drop_pending_updates: bool = False) -> dict:
        """Delete webhook registration from Telegram API."""
        return await self.call("deleteWebhook", {"drop_pending_updates": drop_pending_updates})

    async def download_photo(self, file_id: str, destination: Path) -> Path:
        file_info = await self.call("getFile", {"file_id": file_id})
        file_path = file_info["file_path"]
        url = f"https://api.telegram.org/file/bot{self.bot_token}/{file_path}"
        destination.parent.mkdir(parents=True, exist_ok=True)
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url)
            response.raise_for_status()
        destination.write_bytes(response.content)
        return destination

    async def read_business_message(
        self,
        business_connection_id: str,
        chat_id: int | str,
        message_id: int,
    ) -> bool:
        """Belgilangan xabarni Telegram Business nomidan o'qilgan (double checkmark ✓✓) deb belgilash."""
        try:
            await self.call("readBusinessMessage", {
                "business_connection_id": business_connection_id,
                "chat_id": chat_id,
                "message_id": message_id,
            })
            return True
        except Exception:
            return False

    async def send_chat_action(
        self,
        chat_id: int | str,
        action: str = "typing",
        business_connection_id: str | None = None,
    ) -> bool:
        payload: dict = {"chat_id": chat_id, "action": action}
        if business_connection_id:
            payload["business_connection_id"] = business_connection_id
        try:
            await self.call("sendChatAction", payload)
            return True
        except Exception:
            return False

    async def send_business_text(self, business_connection_id: str, chat_id: int, text: str) -> dict:
        if not business_connection_id:
            raise TelegramAPIError("Suhbat uchun Telegram Business ulanishi topilmadi")
        clean_text = (text or "").strip()
        if not clean_text:
            raise TelegramAPIError("Xabar matni bo'sh bo'lishi mumkin emas")
        return await self.call("sendMessage", {
            "business_connection_id": business_connection_id,
            "chat_id": chat_id,
            "text": clean_text[:4096],
        })

    async def send_business_photo(
        self,
        business_connection_id: str,
        chat_id: int,
        *,
        photo_file_id: str | None = None,
        photo_path: str | None = None,
        caption: str = "",
    ) -> dict:
        if photo_file_id:
            return await self.call("sendPhoto", {
                "business_connection_id": business_connection_id,
                "chat_id": chat_id,
                "photo": photo_file_id,
                "caption": caption[:1024],
            })
        if not photo_path:
            raise TelegramAPIError("Rasm uchun file_id yoki photo_path kerak")
        path = Path(photo_path)
        if not path.is_file():
            raise TelegramAPIError("Saqlangan mahsulot rasmi topilmadi")
        if not self.bot_token:
            raise TelegramAPIError("TELEGRAM_BOT_TOKEN sozlanmagan")
        data = {
            "business_connection_id": business_connection_id,
            "chat_id": str(chat_id),
            "caption": caption[:1024],
        }
        async with httpx.AsyncClient(timeout=60) as client:
            with path.open("rb") as image_file:
                response = await client.post(
                    f"{self.base_url}/sendPhoto",
                    data=data,
                    files={"photo": (path.name, image_file, "image/jpeg")},
                )
            response.raise_for_status()
            result = response.json()
        if not result.get("ok"):
            raise TelegramAPIError(result.get("description", "Telegram sendPhoto xatosi"))
        return result.get("result", {})

    async def send_message(
        self,
        chat_id: int | str,
        text: str,
        *,
        reply_markup: dict | None = None,
        parse_mode: str | None = None,
        disable_web_page_preview: bool = True,
    ) -> dict:
        payload: dict = {
            "chat_id": chat_id,
            "text": text[:4096],
            "disable_web_page_preview": disable_web_page_preview,
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        if parse_mode is not None:
            payload["parse_mode"] = parse_mode
        return await self.call("sendMessage", payload)

    async def edit_message_text(
        self,
        chat_id: int | str,
        message_id: int,
        text: str,
        *,
        reply_markup: dict | None = None,
        parse_mode: str | None = None,
    ) -> dict:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text[:4096],
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        if parse_mode is not None:
            payload["parse_mode"] = parse_mode
        return await self.call("editMessageText", payload)

    async def answer_callback(
        self,
        callback_query_id: str,
        text: str | None = None,
        *,
        show_alert: bool = False,
    ) -> dict:
        payload: dict = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text[:200]
        if show_alert:
            payload["show_alert"] = True
        return await self.call("answerCallbackQuery", payload)

    async def notify_admin(self, text: str) -> None:
        target_chat_id = settings.telegram_admin_chat_id or (
            str(settings.admin_telegram_id) if settings.admin_telegram_id else None
        )
        if not target_chat_id:
            return
        await self.call("sendMessage", {
            "chat_id": target_chat_id,
            "text": text[:4096],
            "disable_web_page_preview": True,
        })

    async def notify_organization_admins(
        self,
        db,
        organization_id: int,
        text: str,
        reply_markup: dict | None = None,
    ) -> None:
        """Send push notification to all admins/operators of an organization with Telegram user IDs."""
        from sqlalchemy import select
        from app.models import Admin, OrganizationMember, User

        notified = False
        admin_ids: list[int] = []
        try:
            admin_res = await db.execute(
                select(Admin.telegram_user_id)
                .where(Admin.organization_id == organization_id, Admin.is_active.is_(True))
            )
            admin_ids = [row[0] for row in admin_res.fetchall() if row[0]]

            member_res = await db.execute(
                select(User.telegram_user_id)
                .join(OrganizationMember, OrganizationMember.user_id == User.id)
                .where(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.is_active.is_(True),
                    User.telegram_user_id.is_not(None),
                )
            )
            for row in member_res.fetchall():
                if row[0] and row[0] not in admin_ids:
                    admin_ids.append(row[0])
        except Exception:
            pass

        for tid in admin_ids:
            try:
                payload = {
                    "chat_id": str(tid),
                    "text": text[:4096],
                    "disable_web_page_preview": True,
                }
                if reply_markup:
                    payload["reply_markup"] = reply_markup
                await self.call("sendMessage", payload)
                notified = True
            except Exception:
                pass

        if not notified:
            await self.notify_admin(text)

    async def get_user_profile_photo_bytes(self, user_id: int) -> bytes | None:
        import time
        if not hasattr(self, "_avatar_cache"):
            self._avatar_cache = {}
        now = time.time()
        if user_id in self._avatar_cache:
            ts, cached_data = self._avatar_cache[user_id]
            if now - ts < 1800:
                return cached_data

        try:
            res = await self.call("getUserProfilePhotos", {"user_id": user_id, "limit": 1})
            photos = res.get("photos", [])
            if not photos or not photos[0]:
                self._avatar_cache[user_id] = (now, None)
                return None
            photo_size = photos[0][1] if len(photos[0]) > 1 else photos[0][0]
            file_id = photo_size["file_id"]
            file_info = await self.call("getFile", {"file_id": file_id})
            file_path = file_info["file_path"]
            url = f"https://api.telegram.org/file/bot{self.bot_token}/{file_path}"
            client = self._get_client()
            response = await client.get(url)
            if response.status_code == 200:
                data = response.content
                self._avatar_cache[user_id] = (now, data)
                return data
        except Exception:
            pass

        self._avatar_cache[user_id] = (now, None)
        return None


_services_cache: dict[str, TelegramService] = {}


def get_telegram_service(bot_token: str | None = None) -> TelegramService:
    """Factory: return a TelegramService for the given token (or global fallback)."""
    token = (bot_token or "").strip() or settings.telegram_bot_token
    if not token:
        raise TelegramAPIError("Telegram bot token sozlanmagan. Iltimos, tashkilot sozlamalarida bot tokenni kiriting.")
    if token not in _services_cache:
        _services_cache[token] = TelegramService(bot_token=token)
    return _services_cache[token]


# Global instance using the default token from settings (for backward-compatibility)
try:
    telegram = TelegramService()
except Exception:
    telegram = None  # In case default TELEGRAM_BOT_TOKEN is empty
