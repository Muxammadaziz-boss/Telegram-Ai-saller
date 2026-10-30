"""Read-only public-channel history importer.

Uses a Telegram user session (MTProto) only to read a public channel's history.
The account must be authorized to access the channel. Keep the generated .session file secret.
"""
import asyncio
import base64
import os
from telethon import TelegramClient
import httpx
from dotenv import load_dotenv

load_dotenv()

API_ID = int(os.environ.get("TELEGRAM_API_ID", "0"))
API_HASH = os.environ.get("TELEGRAM_API_HASH", "")
PHONE = os.environ.get("TELEGRAM_PHONE", "")
CHANNEL = os.environ.get("TELEGRAM_PUBLIC_CHANNEL", "").strip().lstrip("@")
BACKEND_URL = os.environ.get("IMPORT_API_URL", "http://localhost:8000/internal/knowledge/ingest")
INGEST_TOKEN = os.environ.get("INTERNAL_INGEST_TOKEN", "")


async def main() -> None:
    if not API_ID or not API_HASH or not CHANNEL or not INGEST_TOKEN:
        raise SystemExit("TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PUBLIC_CHANNEL va INTERNAL_INGEST_TOKEN kerak")

    client = TelegramClient("channel_import_session", API_ID, API_HASH)
    await client.start(phone=PHONE or None)
    channel = await client.get_entity(CHANNEL)
    headers = {"X-Ingest-Token": INGEST_TOKEN}
    imported = 0

    async with httpx.AsyncClient(timeout=90) as http:
        # reverse=True walks oldest -> newest, making initial import deterministic.
        async for message in client.iter_messages(channel, reverse=True):
            text = message.message or ""
            photo_bytes = None
            if message.photo:
                try:
                    photo_bytes = await client.download_media(message, file=bytes)
                    if photo_bytes and len(photo_bytes) > 8 * 1024 * 1024:
                        print(f"Rasm 8 MB limitidan katta, faqat matn import qilinadi: post={message.id}")
                        photo_bytes = None
                except Exception as exc:
                    print(f"Rasm yuklanmadi, post={message.id}: {type(exc).__name__}")
            if not text.strip() and not photo_bytes:
                continue

            payload = {
                "channel_username": CHANNEL,
                "telegram_message_id": message.id,
                "text": text,
                "posted_at": message.date.isoformat() if message.date else None,
                "source_url": f"https://t.me/{CHANNEL}/{message.id}",
                "photo_base64": base64.b64encode(photo_bytes).decode("ascii") if photo_bytes else None,
                "photo_mime_type": "image/jpeg",
            }
            response = await http.post(BACKEND_URL, headers=headers, json=payload)
            response.raise_for_status()
            imported += 1
            if imported % 50 == 0:
                print(f"Import qilindi: {imported} ta post")
            await asyncio.sleep(0.15)  # gentle pacing; do not hammer Telegram or the API

    print(f"Tayyor. Import qilingan postlar: {imported}")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
