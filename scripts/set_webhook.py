import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Xatolik: .env faylda TELEGRAM_BOT_TOKEN topilmadi")
        return

    public_url = os.environ.get("PUBLIC_WEBHOOK_URL")
    if not public_url:
        print("Xatolik: .env faylda PUBLIC_WEBHOOK_URL sozlanmagan.")
        print("Masalan: PUBLIC_WEBHOOK_URL=https://your-domain.uz yoki ngrok URL")
        return

    url = public_url.rstrip("/") + "/telegram/webhook"
    secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
    payload = {
        "url": url,
        "secret_token": secret,
        "allowed_updates": [
            "message",
            "callback_query",
            "business_connection",
            "business_message",
            "edited_business_message",
            "channel_post",
            "edited_channel_post",
        ],
        "drop_pending_updates": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(f"https://api.telegram.org/bot{token}/setWebhook", json=payload)
        response.raise_for_status()
        print("Telegram webhook o'rnatildi:", response.json())

if __name__ == "__main__":
    asyncio.run(main())
