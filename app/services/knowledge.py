import base64
from datetime import datetime
from pathlib import Path
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger
from app.models import ChannelPost

logger = get_logger(__name__)


class KnowledgeService:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        ) if settings.openai_api_key else None

    async def embed(self, text: str) -> list[float] | None:
        if not self.client or not text.strip():
            return None
        response = await self.client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text[:12000],
        )
        return response.data[0].embedding

    async def describe_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
        if not self.client:
            return ""
        encoded = base64.b64encode(image_bytes).decode("ascii")
        response = await self.client.responses.create(
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


knowledge = KnowledgeService()
