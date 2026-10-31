"""Service for managing dynamic application, store settings, and connected Telegram channels."""

from datetime import datetime, timezone
from sqlalchemy import delete, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.models import ChannelPost, ConnectedChannel, SystemSetting

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


# ---------------------------------------------------------------------------
# Connected Channels Management (Multi-channel support)
# ---------------------------------------------------------------------------

async def list_channels(db: AsyncSession) -> list[ConnectedChannel]:
    """List all connected channels, auto-migrating legacy channels if empty."""
    res = await db.execute(select(ConnectedChannel).order_by(ConnectedChannel.created_at.desc()))
    channels = list(res.scalars().all())

    if not channels:
        # Check if legacy channels exist in SystemSetting or ChannelPost
        legacy_candidates: list[str] = []
        custom_ch = await get_setting(db, "public_channel", default="")
        if custom_ch:
            legacy_candidates.append(clean_channel_username(custom_ch))
        if settings.telegram_public_channel:
            legacy_candidates.append(clean_channel_username(settings.telegram_public_channel))

        # Check existing posts
        try:
            post_channels = (await db.execute(select(distinct(ChannelPost.channel_username)))).scalars().all()
            for ch in post_channels:
                if ch:
                    legacy_candidates.append(clean_channel_username(ch))
        except Exception:
            pass

        seen = set()
        for cand in legacy_candidates:
            if cand and cand not in seen:
                seen.add(cand)
                p_cnt = (await db.execute(
                    select(func.count(ChannelPost.id)).where(ChannelPost.channel_username == cand)
                )).scalar() or 0
                new_ch = ConnectedChannel(
                    channel_username=cand,
                    title=f"@{cand}",
                    is_active=True,
                    posts_count=p_cnt,
                    last_synced_at=datetime.now(timezone.utc) if p_cnt > 0 else None,
                )
                db.add(new_ch)
                channels.append(new_ch)
        if channels:
            await db.flush()

    # Update posts count for each channel
    for ch in channels:
        try:
            p_cnt = (await db.execute(
                select(func.count(ChannelPost.id)).where(ChannelPost.channel_username == ch.channel_username)
            )).scalar() or 0
            if ch.posts_count != p_cnt:
                ch.posts_count = p_cnt
        except Exception:
            pass

    return channels


async def get_active_channel_usernames(db: AsyncSession) -> list[str]:
    """Get clean usernames of all active connected channels."""
    channels = await list_channels(db)
    return [c.channel_username for c in channels if c.is_active]


async def add_channel(
    db: AsyncSession,
    raw_channel: str,
    title: str | None = None,
    added_by: int | None = None,
) -> ConnectedChannel:
    """Add a new connected channel or reactivate if already exists."""
    clean = clean_channel_username(raw_channel)
    if not clean:
        raise ValueError("Kanal username yoki havolasi noto'g'ri")

    res = await db.execute(select(ConnectedChannel).where(ConnectedChannel.channel_username == clean))
    existing = res.scalar_one_or_none()
    if existing:
        existing.is_active = True
        if title:
            existing.title = title
        await db.flush()
        return existing

    p_cnt = (await db.execute(
        select(func.count(ChannelPost.id)).where(ChannelPost.channel_username == clean)
    )).scalar() or 0

    new_channel = ConnectedChannel(
        channel_username=clean,
        title=title or f"@{clean}",
        is_active=True,
        added_by=added_by,
        posts_count=p_cnt,
    )
    db.add(new_channel)
    await db.flush()
    logger.info("Yangi kanal ulandi: @%s", clean)
    return new_channel


async def remove_channel(db: AsyncSession, channel_id_or_username: int | str) -> bool:
    """Remove a channel from connected channels."""
    if isinstance(channel_id_or_username, int) or (isinstance(channel_id_or_username, str) and str(channel_id_or_username).isdigit()):
        cid = int(channel_id_or_username)
        res = await db.execute(select(ConnectedChannel).where(ConnectedChannel.id == cid))
    else:
        clean = clean_channel_username(str(channel_id_or_username))
        res = await db.execute(select(ConnectedChannel).where(ConnectedChannel.channel_username == clean))

    channel = res.scalar_one_or_none()
    if not channel:
        return False

    await db.delete(channel)
    await db.flush()
    logger.info("Kanal o'chirildi: @%s", channel.channel_username)
    return True


async def update_channel_stats(db: AsyncSession, channel_username: str, count: int) -> None:
    """Update post count and last synced timestamp for a channel."""
    clean = clean_channel_username(channel_username)
    res = await db.execute(select(ConnectedChannel).where(ConnectedChannel.channel_username == clean))
    ch = res.scalar_one_or_none()
    if ch:
        ch.posts_count = count
        ch.last_synced_at = datetime.now(timezone.utc)
        await db.flush()


async def get_public_channel(db: AsyncSession) -> str:
    """Get the primary active public channel username (legacy compatibility)."""
    active = await get_active_channel_usernames(db)
    if active:
        return active[0]
    custom = await get_setting(db, "public_channel", default="")
    raw = custom or settings.telegram_public_channel
    return clean_channel_username(raw)


async def set_public_channel(db: AsyncSession, raw_channel: str) -> str:
    """Add or set channel (legacy compatibility)."""
    ch = await add_channel(db, raw_channel)
    await set_setting(db, "public_channel", ch.channel_username, description="Primary public channel")
    return ch.channel_username


async def list_settings(db: AsyncSession) -> dict[str, str]:
    """Return all system settings as a key-value dictionary."""
    result = await db.execute(select(SystemSetting))
    rows = result.scalars().all()
    data = {row.key: row.value for row in rows}
    active = await get_active_channel_usernames(db)
    if active:
        data["public_channel"] = active[0]
        data["connected_channels"] = ",".join(active)
    elif "public_channel" not in data and settings.telegram_public_channel:
        data["public_channel"] = clean_channel_username(settings.telegram_public_channel)
    return data
