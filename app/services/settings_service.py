"""Service for managing dynamic application and store settings."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models import SystemSetting

logger = get_logger(__name__)


def clean_channel_username(raw: str) -> str:
    """Extract clean Telegram channel username from full URL or @handle."""
    raw = (raw or "").strip()
    for prefix in ("https://t.me/", "http://t.me/", "t.me/", "@"):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
    return raw.strip("/").strip()


async def get_setting(db: AsyncSession, key: str, default: str = "") -> str:
    """Retrieve a setting value from the database, falling back to default."""
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    row = result.scalar_one_or_none()
    if row is not None and row.value:
        return row.value
    return default


async def set_setting(
    db: AsyncSession,
    key: str,
    value: str,
    description: str | None = None,
) -> SystemSetting:
    """Insert or update a setting value."""
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        row = SystemSetting(key=key, value=value, description=description)
        db.add(row)
    else:
        row.value = value
        if description is not None:
            row.description = description
    await db.flush()
    logger.info("Sozlama yangilandi: key=%s, value=%s", key, value)
    return row


async def get_public_channel(db: AsyncSession) -> str:
    """Get the active public channel username (from DB if set, else from env)."""
    custom = await get_setting(db, "public_channel", default="")
    raw = custom or settings.telegram_public_channel
    return clean_channel_username(raw)


async def set_public_channel(db: AsyncSession, raw_channel: str) -> str:
    """Set the public channel username/url in the database."""
    cleaned = clean_channel_username(raw_channel)
    if not cleaned:
        raise ValueError("Kanal username yoki havolasi bo'sh bo'lishi mumkin emas")
    await set_setting(
        db,
        key="public_channel",
        value=cleaned,
        description="Public Telegram kanal username (mahsulotlar bazasi)",
    )
    return cleaned


async def list_settings(db: AsyncSession) -> dict[str, str]:
    """Return all system settings as a key-value dictionary."""
    result = await db.execute(select(SystemSetting))
    rows = result.scalars().all()
    data = {row.key: row.value for row in rows}
    # Include default channel if not customized in DB
    if "public_channel" not in data and settings.telegram_public_channel:
        data["public_channel"] = clean_channel_username(settings.telegram_public_channel)
    return data
