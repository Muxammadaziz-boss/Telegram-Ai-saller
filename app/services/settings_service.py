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


async def get_setting(db: AsyncSession, key: str, default: str = "", organization_id: int | None = None) -> str:
    """Retrieve a setting value from the database, falling back to default."""
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    if organization_id is not None:
        stmt = stmt.where((SystemSetting.organization_id == organization_id) | (SystemSetting.organization_id.is_(None)))
        stmt = stmt.order_by(SystemSetting.organization_id.desc().nullslast())
    result = await db.execute(stmt)
    row = result.scalars().first()
    if row is not None and row.value:
        return row.value
    return default


async def set_setting(
    db: AsyncSession,
    key: str,
    value: str,
    description: str | None = None,
    organization_id: int | None = None,
) -> SystemSetting:
    """Insert or update a setting value."""
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    if organization_id is not None:
        stmt = stmt.where(SystemSetting.organization_id == organization_id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        row = SystemSetting(key=key, value=value, description=description, organization_id=organization_id)
        db.add(row)
    else:
        row.value = value
        if description is not None:
            row.description = description
        if organization_id is not None and row.organization_id is None:
            row.organization_id = organization_id
    await db.flush()
    logger.info("Sozlama yangilandi: key=%s, value=%s, org_id=%s", key, value, organization_id)
    return row


# ---------------------------------------------------------------------------
# Connected Channels Management (Multi-channel support)
# ---------------------------------------------------------------------------

async def list_channels(db: AsyncSession, organization_id: int | None = None) -> list[ConnectedChannel]:
    """List connected channels scoped by organization."""
    stmt = select(ConnectedChannel)
    if organization_id is not None:
        stmt = stmt.where(ConnectedChannel.organization_id == organization_id)
    res = await db.execute(stmt.order_by(ConnectedChannel.created_at.desc()))
    channels = list(res.scalars().all())

    if not channels and organization_id in (None, 1):
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
                    organization_id=organization_id or 1,
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
            count_stmt = select(func.count(ChannelPost.id)).where(ChannelPost.channel_username == ch.channel_username)
            if organization_id is not None:
                count_stmt = count_stmt.where(ChannelPost.organization_id == organization_id)
            p_cnt = (await db.execute(count_stmt)).scalar() or 0
            if ch.posts_count != p_cnt:
                ch.posts_count = p_cnt
        except Exception:
            pass

    return channels


async def get_active_channel_usernames(db: AsyncSession, organization_id: int | None = None) -> list[str]:
    """Get clean usernames of all active connected channels."""
    channels = await list_channels(db, organization_id=organization_id)
    return [c.channel_username for c in channels if c.is_active]


async def add_channel(
    db: AsyncSession,
    raw_channel: str,
    title: str | None = None,
    added_by: int | None = None,
    organization_id: int | None = None,
) -> ConnectedChannel:
    """Add a new connected channel or reactivate if already exists."""
    clean = clean_channel_username(raw_channel)
    if not clean:
        raise ValueError("Kanal username yoki havolasi noto'g'ri")

    stmt = select(ConnectedChannel).where(ConnectedChannel.channel_username == clean)
    if organization_id is not None:
        stmt = stmt.where(ConnectedChannel.organization_id == organization_id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        existing.is_active = True
        if title:
            existing.title = title
        if organization_id is not None and existing.organization_id is None:
            existing.organization_id = organization_id
        await db.flush()
        return existing

    count_stmt = select(func.count(ChannelPost.id)).where(ChannelPost.channel_username == clean)
    if organization_id is not None:
        count_stmt = count_stmt.where(ChannelPost.organization_id == organization_id)
    p_cnt = (await db.execute(count_stmt)).scalar() or 0

    new_channel = ConnectedChannel(
        channel_username=clean,
        title=title or f"@{clean}",
        is_active=True,
        added_by=added_by,
        organization_id=organization_id,
        posts_count=p_cnt,
    )
    db.add(new_channel)
    await db.flush()
    logger.info("Kanal ulandi: username=%s, org_id=%s, added_by=%s", clean, organization_id, added_by)
    return new_channel


async def remove_channel(
    db: AsyncSession,
    identifier: str,
    organization_id: int | None = None,
) -> ConnectedChannel | None:
    """Soft-remove (deactivate) or delete a connected channel."""
    stmt = select(ConnectedChannel)
    if identifier.isdigit():
        stmt = stmt.where(ConnectedChannel.id == int(identifier))
    else:
        clean = clean_channel_username(identifier)
        stmt = stmt.where(ConnectedChannel.channel_username == clean)
    if organization_id is not None:
        stmt = stmt.where(ConnectedChannel.organization_id == organization_id)

    res = await db.execute(stmt)
    channel = res.scalar_one_or_none()
    if channel is None:
        return None

    channel.is_active = False
    await db.delete(channel)
    await db.flush()
    logger.info("Kanal o'chirildi: id=%s, username=%s, org_id=%s", channel.id, channel.channel_username, organization_id)
    return channel


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
