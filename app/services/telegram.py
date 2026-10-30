from pathlib import Path
import httpx
from app.core.config import settings


class TelegramAPIError(RuntimeError):
    pass


class TelegramService:
    def __init__(self) -> None:
        self.base_url = f"https://api.telegram.org/bot{settings.telegram_bot_token}"
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return self._client

    async def call(self, method: str, payload: dict) -> dict:
        if not settings.telegram_bot_token:
            raise TelegramAPIError("TELEGRAM_BOT_TOKEN sozlanmagan")
        client = self._get_client()
        response = await client.post(f"{self.base_url}/{method}", json=payload)
        response.raise_for_status()
        result = response.json()
        if not result.get("ok"):
            raise TelegramAPIError(result.get("description", f"Telegram {method} xatosi"))
        return result.get("result", {})

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
        return await self.call("sendMessage", {
            "business_connection_id": business_connection_id,
            "chat_id": chat_id,
            "text": text[:4096],
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
        if not settings.telegram_bot_token:
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

    async def download_photo(self, file_id: str, destination: Path) -> Path:
        file_info = await self.call("getFile", {"file_id": file_id})
        file_path = file_info["file_path"]
        url = f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file_path}"
        destination.parent.mkdir(parents=True, exist_ok=True)
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url)
            response.raise_for_status()
        destination.write_bytes(response.content)
        return destination


telegram = TelegramService()
