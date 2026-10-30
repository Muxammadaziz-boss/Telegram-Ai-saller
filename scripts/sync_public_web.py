import asyncio
import re
import httpx
from html import unescape
from datetime import datetime, timezone
from app.core.db import SessionLocal
from app.services.knowledge import knowledge
from app.services import settings_service

async def sync_public_channel():
    async with SessionLocal() as db:
        channel = await settings_service.get_public_channel(db)
        if not channel:
            print("Kanal sozlanmagan!")
            return
        channel_name = channel.lstrip("@").strip()
        url = f"https://t.me/s/{channel_name}"
        print(f"Sinxronlanmoqda: {url}")
        
        async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}, timeout=30.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                print(f"Telegram web sahifasi ochilmadi: {resp.status_code}")
                return
            
            blocks = resp.text.split('<div class="tgme_widget_message ')
            imported = 0
            for block in blocks[1:]:
                post_m = re.search(r'data-post="([^"]+)"', block)
                if not post_m:
                    continue
                full_id = post_m.group(1) # e.g. Test_pcssss/33
                msg_id = int(full_id.split("/")[-1])
                
                # Text
                text_m = re.search(r'<div class="tgme_widget_message_text[^>]*>(.*?)</div>\s*<div class="tgme_widget_message_footer', block, re.DOTALL)
                text = ""
                if text_m:
                    raw_text = text_m.group(1)
                    cleaned = re.sub(r'<br\s*/?>', '\n', raw_text)
                    cleaned = re.sub(r'<[^>]+>', '', cleaned)
                    text = unescape(cleaned).strip()
                
                # Photos
                photo_urls = re.findall(r"background-image:url\('([^']+)'\)", block)
                photo_bytes = None
                if photo_urls:
                    try:
                        p_resp = await client.get(photo_urls[-1])
                        if p_resp.status_code == 200:
                            photo_bytes = p_resp.content
                    except Exception as e:
                        print(f"Rasm yuklashda xatolik: {e}")
                
                # Date
                date_m = re.search(r'<time datetime="([^"]+)"', block)
                posted_at = None
                if date_m:
                    try:
                        posted_at = datetime.fromisoformat(date_m.group(1))
                    except Exception:
                        pass
                
                if not text and not photo_bytes:
                    continue
                
                print(f"Post {msg_id} bazaga saqlanmoqda...")
                await knowledge.upsert_post(
                    db,
                    channel_username=channel_name,
                    telegram_message_id=msg_id,
                    text=text,
                    posted_at=posted_at,
                    source_url=f"https://t.me/{channel_name}/{msg_id}",
                    photo_bytes=photo_bytes,
                    photo_mime_type="image/jpeg",
                )
                await db.commit()
                imported += 1
                print(f"Post {msg_id} saqlandi!")
                
            print(f"Tayyor! Jami {imported} ta post import qilindi.")

if __name__ == "__main__":
    asyncio.run(sync_public_channel())
