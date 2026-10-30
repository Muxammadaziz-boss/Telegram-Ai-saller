import base64
from datetime import datetime
from pathlib import Path
import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger
from app.models import ChannelPost

logger = get_logger(__name__)


class KnowledgeService:
    def __init__(self) -> None:
        self.gemini_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model or "gemini-3.1-flash-lite"
        self.gemini_embedding_model = settings.gemini_embedding_model or "gemini-embedding-001"
        self.openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        ) if settings.openai_api_key else None

    async def embed(self, text: str) -> list[float] | None:
        if not text.strip():
            return None

        # 1. Try Gemini if configured
        if self.gemini_key and (settings.ai_provider in ("gemini", "auto") or not self.openai_client):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_embedding_model}:embedContent?key={self.gemini_key}"
            body = {
                "content": {"parts": [{"text": text[:10000]}]},
                "outputDimensionality": settings.openai_embedding_dim,
            }
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=body)
                    resp.raise_for_status()
                    data = resp.json()
                    return data.get("embedding", {}).get("values")
            except Exception:
                logger.exception("Gemini embedding yaratishda xatolik")
                return None

        # 2. Fallback to OpenAI
        if self.openai_client:
            try:
                response = await self.openai_client.embeddings.create(
                    model=settings.openai_embedding_model,
                    input=text[:12000],
                )
                return response.data[0].embedding
            except Exception:
                logger.exception("OpenAI embedding yaratishda xatolik")
                return None

        return None

    async def describe_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        # 1. Try Gemini Vision if configured
        if self.gemini_key and (settings.ai_provider in ("gemini", "auto") or not self.openai_client):
            encoded = base64.b64encode(image_bytes).decode("ascii")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_key}"
            body = {
                "systemInstruction": {
                    "parts": [{"text": "Sen mahsulot katalogi uchun rasmni tavsiflovchi yordamchisan. Faqat ko'rinib turgan faktlarni o'zbek tilida qisqa bayon qil. Narx, brend, model yoki xususiyatni rasmda aniq ko'rinmasa taxmin qilma."}]
                },
                "contents": [{
                    "role": "user",
                    "parts": [
                        {"text": "Ushbu mahsulot rasmini katalog qidiruvi uchun tavsifla."},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": encoded,
                            }
                        }
                    ]
                }],
                "generationConfig": {"temperature": 0.2}
            }
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, json=body)
                    resp.raise_for_status()
                    data = resp.json()
                    return (data["candidates"][0]["content"]["parts"][0]["text"] or "").strip()
            except Exception:
                logger.exception("Gemini rasm tavsifini olishda xatolik")
                return ""

        # 2. Fallback to OpenAI
        if not self.openai_client:
            return ""
        encoded = base64.b64encode(image_bytes).decode("ascii")
        try:
            response = await self.openai_client.responses.create(
                model=settings.openai_model,
                instructions=(
                    "Sen mahsulot katalogi uchun rasmni tavsiflovchi yordamchisan. "
                    "Faqat ko'rinib turgan faktlarni o'zbek tilida qisqa bayon qil. "
                    "Narx, brend, model yoki xususiyatni rasmda aniq ko'rinmasa taxmin qilma."
                ),
                input=[{
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "Ushbu mahsulot rasmini katalog qidiruvi uchun tavsifla."},
                        {"type": "input_image", "image_url": f"data:{mime_type};base64,{encoded}"},
                    ],
                }],
            )
            return (response.output_text or "").strip()
        except Exception:
            logger.exception("OpenAI rasm tavsifini olishda xatolik")
            return ""

    async def upsert_post(
        self,
        db: AsyncSession,
        *,
        channel_username: str,
        telegram_message_id: int,
        text: str = "",
        posted_at: datetime | None = None,
        source_url: str | None = None,
        photo_file_id: str | None = None,
        photo_bytes: bytes | None = None,
        photo_mime_type: str = "image/jpeg",
    ) -> ChannelPost:
        channel = channel_username.lstrip("@").strip()
        result = await db.execute(select(ChannelPost).where(
            ChannelPost.channel_username == channel,
            ChannelPost.telegram_message_id == telegram_message_id,
        ))
        post = result.scalar_one_or_none()
        if post is None:
            post = ChannelPost(channel_username=channel, telegram_message_id=telegram_message_id)
            db.add(post)

        image_path = None
        image_description = post.image_description if post else ""
        if photo_bytes:
            safe_channel = "".join(ch for ch in channel if ch.isalnum() or ch in "-_" ) or "channel"
            directory = Path(settings.storage_dir) / "channel_images" / safe_channel
            directory.mkdir(parents=True, exist_ok=True)
            extension = ".png" if photo_mime_type == "image/png" else ".jpg"
            target = directory / f"{telegram_message_id}{extension}"
            target.write_bytes(photo_bytes)
            image_path = str(target)
            try:
                image_description = await self.describe_image(photo_bytes, photo_mime_type)
            except Exception:
                logger.exception("Rasm tavsifini yaratishda xatolik: msg_id=%s", telegram_message_id)
                image_description = ""

        post.text = text.strip()
        post.posted_at = posted_at or post.posted_at
        post.source_url = source_url or post.source_url
        post.photo_file_id = photo_file_id or post.photo_file_id
        post.image_path = image_path or post.image_path
        post.image_description = image_description or post.image_description
        content = "\n".join(part for part in [post.text, post.image_description] if part).strip()
        if content:
            try:
                post.embedding = await self.embed(content)
            except Exception:
                logger.exception("Embedding yaratishda xatolik: post_id=%s", telegram_message_id)
                post.embedding = None
        await db.flush()
        return post

    async def search(self, db: AsyncSession, query: str, limit: int = 6) -> list[ChannelPost]:
        vector = None
        try:
            vector = await self.embed(query)
        except Exception:
            logger.exception("Qidiruv embedding yaratishda xatolik")
            vector = None
        if vector:
            distance = ChannelPost.embedding.cosine_distance(vector)
            stmt = (
                select(ChannelPost)
                .where(ChannelPost.embedding.is_not(None), distance < 0.62)
                .order_by(distance)
                .limit(limit)
            )
            rows = (await db.execute(stmt)).scalars().all()
            if rows:
                return list(rows)
        # Fallback for unembedded posts or when the embedding API is unavailable.
        tokens = [token.strip("?!.,:;()[]{}\"'").lower() for token in query.split() if len(token.strip("?!.,:;()[]{}\"'") ) > 2][:6]
        if not tokens:
            return []
        def _escape_like(t: str) -> str:
            return t.replace("%", "\\%").replace("_", "\\_")
        conditions = [
            ChannelPost.text.ilike(f"%{_escape_like(token)}%") | ChannelPost.image_description.ilike(f"%{_escape_like(token)}%")
            for token in tokens
        ]
        stmt = select(ChannelPost).where(or_(*conditions)).order_by(ChannelPost.posted_at.desc().nullslast()).limit(limit)
        return list((await db.execute(stmt)).scalars().all())

    async def sync_channel_posts(self, db: AsyncSession, channel_username: str) -> int:
        """Sync posts from public Telegram channel web preview without MTProto login."""
        import re
        from html import unescape
        clean_name = channel_username.lstrip("@").strip()
        if not clean_name:
            return 0
        url = f"https://t.me/s/{clean_name}"
        logger.info("Kanal postlari sinxronlanmoqda: %s", url)

        async with httpx.AsyncClient(headers={"User-Agent": "Mozilla/5.0"}, timeout=30.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning("Telegram web sahifasi ochilmadi: code=%s url=%s", resp.status_code, url)
                return 0

            blocks = resp.text.split('<div class="tgme_widget_message ')
            imported = 0
            for block in blocks[1:]:
                post_m = re.search(r'data-post="([^"]+)"', block)
                if not post_m:
                    continue
                full_id = post_m.group(1)
                msg_id = int(full_id.split("/")[-1])

                text_m = re.search(r'<div class="tgme_widget_message_text[^>]*>(.*?)</div>\s*<div class="tgme_widget_message_footer', block, re.DOTALL)
                text = ""
                if text_m:
                    raw_text = text_m.group(1)
                    cleaned = re.sub(r'<br\s*/?>', '\n', raw_text)
                    cleaned = re.sub(r'<[^>]+>', '', cleaned)
                    text = unescape(cleaned).strip()

                photo_urls = re.findall(r"background-image:url\('([^']+)'\)", block)
                photo_bytes = None
                valid_photo_urls = [u for u in photo_urls if u.startswith("http://") or u.startswith("https://")]
                if valid_photo_urls:
                    try:
                        p_resp = await client.get(valid_photo_urls[-1])
                        if p_resp.status_code == 200:
                            photo_bytes = p_resp.content
                    except Exception:
                        photo_bytes = None

                date_m = re.search(r'<time datetime="([^"]+)"', block)
                posted_at = None
                if date_m:
                    try:
                        posted_at = datetime.fromisoformat(date_m.group(1))
                    except Exception:
                        posted_at = None

                if not text and not photo_bytes:
                    continue

                await self.upsert_post(
                    db,
                    channel_username=clean_name,
                    telegram_message_id=msg_id,
                    text=text,
                    posted_at=posted_at,
                    source_url=f"https://t.me/{clean_name}/{msg_id}",
                    photo_bytes=photo_bytes,
                    photo_mime_type="image/jpeg",
                )
                imported += 1

            logger.info("Jami %s ta post sinxronlandi: kanal=%s", imported, clean_name)
            return imported


knowledge = KnowledgeService()
