import base64
from datetime import datetime
from pathlib import Path
import re
import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.logging import get_logger
from app.models import ChannelPost, ConnectedChannel, Product

logger = get_logger(__name__)


def parse_product_from_text(text: str, default_category: str = "General") -> dict | None:
    """Parse product title, price, specs, warranty from a Telegram post text."""
    if not text or len(text.strip()) < 8:
        return None
    lines = [line.strip() for line in text.strip().split("\n") if line.strip()]
    if not lines:
        return None

    # Title is usually the first non-empty line
    title = lines[0].replace("#", "").replace("*", "").replace("🔹", "").replace("🔥", "").strip()
    if len(title) > 200:
        title = title[:197] + "..."

    price = "$0"
    warranty = "Mavjud"
    specs_parts = []
    category = default_category

    # Common price patterns in Uzbek/English/Russian channels
    price_pattern = re.compile(
        r"(?:narxi?|price|baho|qiymati)?[:\s]*(\$?\s*\d[\d\s,.]*\s*(?:\$|USD|dollar|so'?m|som|UZS)?)",
        re.IGNORECASE,
    )

    for line in lines[1:]:
        lower = line.lower()
        if any(w in lower for w in ["narx", "price", "$", "so'm", "som", "usd"]):
            m = price_pattern.search(line)
            if m and any(char.isdigit() for char in m.group(1)):
                price = m.group(1).strip()
                continue
        if any(w in lower for w in ["kafolat", "warranty", "garantiya"]):
            warranty = line.split(":")[-1].strip() or line.strip()
            continue
        if any(w in lower for w in ["kategoriya", "toifa", "tur"]):
            category = line.split(":")[-1].strip() or category
            continue
        specs_parts.append(line)

    specs = " / ".join(specs_parts[:4])
    if len(specs) > 500:
        specs = specs[:497] + "..."

    return {
        "name": title,
        "price": price,
        "specs": specs,
        "warranty": warranty,
        "category": category,
    }


def chunk_text(text: str, max_chars: int = 1500, overlap: int = 200) -> list[str]:
    """Split long catalog/post text into overlapping semantic chunks."""
    text = text.strip()
    if len(text) <= max_chars:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end >= len(text):
            chunks.append(text[start:].strip())
            break
        break_pos = text.rfind("\n", start, end)
        if break_pos == -1 or break_pos < start + (max_chars // 2):
            break_pos = text.rfind(". ", start, end)
        if break_pos == -1 or break_pos < start + (max_chars // 2):
            break_pos = text.rfind(" ", start, end)
        if break_pos == -1 or break_pos <= start:
            break_pos = end
        chunk = text[start:break_pos].strip()
        if chunk:
            chunks.append(chunk)
        start = max(start + 1, break_pos - overlap)
    return chunks


class KnowledgeService:
    def __init__(self) -> None:
        self.gemini_key = settings.gemini_api_key
        self.gemini_model = settings.gemini_model or "gemini-3.1-flash-lite"
        self.gemini_embedding_model = settings.gemini_embedding_model or "gemini-embedding-001"
        self._http_client: httpx.AsyncClient | None = None
        self.openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        ) if settings.openai_api_key else None

    def _get_http_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=15.0,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
            )
        return self._http_client

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
                client = self._get_http_client()
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
        organization_id: int | None = None,
        text: str = "",
        posted_at: datetime | None = None,
        source_url: str | None = None,
        photo_file_id: str | None = None,
        photo_bytes: bytes | None = None,
        photo_mime_type: str = "image/jpeg",
    ) -> ChannelPost:
        channel = channel_username.lstrip("@").strip()
        query = select(ChannelPost).where(
            ChannelPost.channel_username == channel,
            ChannelPost.telegram_message_id == telegram_message_id,
        )
        if organization_id:
            query = query.where(ChannelPost.organization_id == organization_id)

        result = await db.execute(query)
        post = result.scalar_one_or_none()
        if post is None:
            post = ChannelPost(
                channel_username=channel,
                telegram_message_id=telegram_message_id,
                organization_id=organization_id,
            )
            db.add(post)
        elif organization_id and post.organization_id is None:
            post.organization_id = organization_id

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

    async def search(self, db: AsyncSession, query: str, limit: int = 6, organization_id: int | None = None) -> list[ChannelPost]:
        vector = None
        try:
            vector = await self.embed(query)
        except Exception:
            logger.exception("Qidiruv embedding yaratishda xatolik")
            vector = None
        if vector:
            distance = ChannelPost.embedding.cosine_distance(vector)
            stmt = select(ChannelPost).where(ChannelPost.embedding.is_not(None), distance < 0.62)
            if organization_id is not None:
                stmt = stmt.where(ChannelPost.organization_id == organization_id)
            stmt = stmt.order_by(distance).limit(limit)
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
        stmt = select(ChannelPost).where(or_(*conditions))
        if organization_id is not None:
            stmt = stmt.where(ChannelPost.organization_id == organization_id)
        stmt = stmt.order_by(ChannelPost.posted_at.desc().nullslast()).limit(limit)
        return list((await db.execute(stmt)).scalars().all())

    async def sync_channel_posts(self, db: AsyncSession, channel_username: str, organization_id: int | None = None) -> int:
        """Sync posts from public Telegram channel web preview without MTProto login."""
        import re
        from html import unescape
        clean_name = channel_username.lstrip("@").strip()
        if not clean_name:
            return 0

        # Resolve organization_id if not provided
        if organization_id is None:
            ch_row = (await db.execute(select(ConnectedChannel).where(ConnectedChannel.channel_username == clean_name))).scalars().first()
            if ch_row and ch_row.organization_id:
                organization_id = ch_row.organization_id
            else:
                logger.warning("Kanal uchun organization_id topilmadi: %s", clean_name)
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
                    organization_id=organization_id,
                    text=text,
                    posted_at=posted_at,
                    source_url=f"https://t.me/{clean_name}/{msg_id}",
                    photo_bytes=photo_bytes,
                    photo_mime_type="image/jpeg",
                )
                imported += 1

            logger.info("Jami %s ta post sinxronlandi: kanal=%s", imported, clean_name)
            try:
                from app.services import settings_service
                await settings_service.update_channel_stats(db, clean_name, imported)
            except Exception:
                pass
            return imported

    async def sync_all_channels(self, db: AsyncSession, organization_id: int | None = None) -> dict[str, int]:
        """Sync posts from all active connected channels for the given organization."""
        from app.services import settings_service
        channels = await settings_service.list_channels(db, organization_id=organization_id)
        results: dict[str, int] = {}
        for ch in channels:
            try:
                cnt = await self.sync_channel_posts(db, ch.channel_username, organization_id=ch.organization_id or organization_id)
                results[ch.channel_username] = cnt
            except Exception:
                logger.exception("Kanalni sinxronlashda xatolik: %s", ch.channel_username)
                results[ch.channel_username] = 0
        return results

    async def extract_products_from_channel_posts(self, db: AsyncSession, organization_id: int) -> list[Product]:
        """Parse products, pricing, and specs from channel posts for a given tenant."""
        stmt = (
            select(ChannelPost)
            .where(ChannelPost.organization_id == organization_id)
            .order_by(ChannelPost.posted_at.desc().nullslast())
        )
        posts = (await db.execute(stmt)).scalars().all()
        created_products: list[Product] = []

        for post in posts:
            parsed = parse_product_from_text(post.text)
            if not parsed:
                continue
            code = f"PRD-{post.telegram_message_id}"
            existing = (await db.execute(
                select(Product).where(Product.organization_id == organization_id, Product.code == code)
            )).scalar_one_or_none()
            if existing is None:
                new_prod = Product(
                    organization_id=organization_id,
                    code=code,
                    name=parsed["name"],
                    category=parsed["category"],
                    specs=parsed["specs"],
                    price=parsed["price"],
                    stock="In Stock",
                    warranty=parsed["warranty"],
                    is_active=True,
                )
                db.add(new_prod)
                created_products.append(new_prod)

        if created_products:
            await db.commit()
            for p in created_products:
                await db.refresh(p)
        return created_products


knowledge = KnowledgeService()

