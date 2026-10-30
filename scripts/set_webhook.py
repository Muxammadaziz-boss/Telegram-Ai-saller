import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def main() -> None:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = os.environ["PUBLIC_WEBHOOK_URL"].rstrip("/") + "/telegram/webhook"
    secret = os.environ["TELEGRAM_WEBHOOK_SECRET"]
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
        print(response.json())

if __name__ == "__main__":
    asyncio.run(main())
