import hmac
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.db import get_db
from app.core.permissions import ALL_PERMISSIONS, ROLE_DEFAULTS
from app.models import Admin, ChannelPost, ConnectedChannel, Conversation, Message, Order
from app.schemas import AdminCreate, AdminOut, AdminReply, AdminUpdatePermission, AdminUpdateRole, ChannelCreate, ChannelOut, ChannelSyncRequest, SettingUpdate, StatusUpdate
from app.services import admin_service, settings_service
from app.services.telegram import telegram

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_current_admin(
    x_admin_token: str | None = Header(default=None),
    x_admin_telegram_id: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    # 1. Master token check (owner equivalent)
    if settings.admin_api_token and x_admin_token and hmac.compare_digest(settings.admin_api_token, x_admin_token):
        owner = None
        if settings.admin_telegram_id:
            owner = await admin_service.get_admin_by_telegram_id(db, settings.admin_telegram_id)
            if owner is None:
                owner = await admin_service.ensure_owner(db)
                await db.commit()
        if owner is not None:
            return owner
        # Fallback synthetic owner if no admin_telegram_id configured yet
        return Admin(
            id=0,
            telegram_user_id=settings.admin_telegram_id or 0,
            name="Master Admin",
            role="owner",
            permissions=ROLE_DEFAULTS["owner"],
            is_active=True,
        )

    # 2. Telegram User ID check
    if x_admin_telegram_id:
        try:
            uid = int(x_admin_telegram_id.strip())
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Noto'g'ri Telegram ID")
        admin = await admin_service.get_admin_by_telegram_id(db, uid)
        if admin is not None:
            return admin

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin avtorizatsiyadan o'tmagan")


def require_permission(perm: str):
    async def dependency(current_admin: Admin = Depends(get_current_admin)) -> Admin:
        if not admin_service.has_permission(current_admin, perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu amal uchun ruxsat yo'q: {perm}",
            )
        return current_admin
    return dependency


# Compatibility dependency for simple admin check
async def require_admin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    return current_admin


@router.get("/me")
async def current_admin_info(current_admin: Admin = Depends(get_current_admin)):
    return {
        "id": current_admin.id,
        "telegram_user_id": current_admin.telegram_user_id,
        "name": current_admin.name,
        "username": current_admin.username,
        "role": current_admin.role,
        "permissions": current_admin.permissions,
        "is_active": current_admin.is_active,
    }


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    conversations = await db.scalar(select(func.count(Conversation.id))) or 0
    active = await db.scalar(select(func.count(Conversation.id)).where(Conversation.status == "ai_active")) or 0
    handoff = await db.scalar(select(func.count(Conversation.id)).where(Conversation.status == "human_takeover")) or 0
    posts = await db.scalar(select(func.count(ChannelPost.id))) or 0
    orders = await db.scalar(select(func.count(Order.id))) or 0
    return {"conversations": conversations, "ai_active": active, "human_takeover": handoff, "knowledge_posts": posts, "orders": orders}


@router.get("/conversations", dependencies=[Depends(require_permission("can_view_conversations"))])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Conversation).order_by(Conversation.last_message_at.desc()).limit(100))).scalars().all()
    return [{
        "id": row.id,
        "customer_name": row.customer_name,
        "username": row.username,
        "chat_id": row.chat_id,
        "status": row.status,
        "handoff_reason": row.handoff_reason,
        "business_connection_id": row.business_connection_id,
        "last_message_at": row.last_message_at.isoformat() if row.last_message_at else None,
    } for row in rows]


@router.get("/conversations/{conversation_id}/messages", dependencies=[Depends(require_permission("can_view_conversations"))])
async def conversation_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).limit(300))).scalars().all()
    return [{"id": row.id, "direction": row.direction, "text": row.text, "created_at": row.created_at.isoformat()} for row in rows]


@router.post("/conversations/{conversation_id}/takeover", dependencies=[Depends(require_permission("can_takeover"))])
async def takeover(conversation_id: int, payload: StatusUpdate, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, conversation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    row.status = "human_takeover"
    row.handoff_reason = payload.reason or "Admin panel orqali operator qabul qildi"
    await db.commit()
    return {"ok": True, "status": row.status}


@router.post("/conversations/{conversation_id}/resume", dependencies=[Depends(require_permission("can_resume_ai"))])
async def resume_ai(conversation_id: int, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, conversation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    row.status = "ai_active"
    row.handoff_reason = None
    await db.commit()
    return {"ok": True, "status": row.status}


@router.post("/conversations/{conversation_id}/reply", dependencies=[Depends(require_permission("can_reply_customers"))])
async def admin_reply(conversation_id: int, payload: AdminReply, db: AsyncSession = Depends(get_db)):
    row = await db.get(Conversation, conversation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Suhbat topilmadi")
    sent = await telegram.send_business_text(row.business_connection_id, row.chat_id, payload.text)
    db.add(Message(
        conversation_id=row.id,
        telegram_message_id=int(sent["message_id"]),
        direction="admin",
        text=payload.text,
    ))
    row.status = "human_takeover"
    row.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@router.get("/knowledge", dependencies=[Depends(require_permission("can_view_knowledge"))])
async def knowledge_posts(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(ChannelPost).order_by(ChannelPost.posted_at.desc().nullslast()).limit(100))).scalars().all()
    return [{
        "id": row.id,
        "channel_username": row.channel_username,
        "telegram_message_id": row.telegram_message_id,
        "text": row.text[:500],
        "image_description": row.image_description[:300],
        "source_url": row.source_url,
        "posted_at": row.posted_at.isoformat() if row.posted_at else None,
    } for row in rows]


@router.get("/channels", dependencies=[Depends(require_permission("can_view_knowledge"))])
async def get_channels(db: AsyncSession = Depends(get_db)):
    channels = await settings_service.list_channels(db)
    return [{
        "id": ch.id,
        "channel_username": ch.channel_username,
        "title": ch.title or f"@{ch.channel_username}",
        "is_active": ch.is_active,
        "posts_count": ch.posts_count,
        "last_synced_at": ch.last_synced_at.isoformat() if ch.last_synced_at else None,
        "created_at": ch.created_at.isoformat() if ch.created_at else None,
    } for ch in channels]


@router.post("/channels", dependencies=[Depends(require_permission("can_manage_knowledge"))])
async def add_channel(
    payload: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    try:
        import asyncio
        from app.services.knowledge import knowledge
        ch = await settings_service.add_channel(
            db,
            raw_channel=payload.channel,
            title=payload.title,
            added_by=current_admin.telegram_user_id,
        )
        await db.commit()
        await db.refresh(ch)
        ch_id = ch.id
        ch_username = ch.channel_username
        ch_title = ch.title
        ch_active = ch.is_active
        ch_posts = ch.posts_count
        ch_synced = ch.last_synced_at
        ch_created = ch.created_at

        imported = 0
        try:
            imported = await asyncio.wait_for(knowledge.sync_channel_posts(db, ch_username), timeout=12.0)
            await db.commit()
        except Exception:
            await db.rollback()

        return {
            "ok": True,
            "channel": {
                "id": ch_id,
                "channel_username": ch_username,
                "title": ch_title,
                "is_active": ch_active,
                "posts_count": imported or ch_posts,
                "last_synced_at": ch_synced.isoformat() if ch_synced else None,
                "created_at": ch_created.isoformat() if ch_created else None,
            },
            "imported_posts": imported,
        }
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/channels/{identifier}", dependencies=[Depends(require_permission("can_manage_knowledge"))])
async def delete_channel(identifier: str, db: AsyncSession = Depends(get_db)):
    removed = await settings_service.remove_channel(db, identifier)
    if not removed:
        raise HTTPException(status_code=404, detail="Kanal topilmadi")
    await db.commit()
    return {"ok": True, "identifier": identifier}


@router.post("/channels/sync", dependencies=[Depends(require_permission("can_manage_knowledge"))])
async def sync_channels(
    payload: ChannelSyncRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    from app.services.knowledge import knowledge
    if payload and payload.channel:
        clean = settings_service.clean_channel_username(payload.channel)
        cnt = await knowledge.sync_channel_posts(db, clean)
        await db.commit()
        return {"ok": True, "synced": {clean: cnt}, "total_synced": cnt}
    results = await knowledge.sync_all_channels(db)
    await db.commit()
    total = sum(results.values())
    return {"ok": True, "synced": results, "total_synced": total}


@router.post("/knowledge/sync", dependencies=[Depends(require_permission("can_manage_knowledge"))])
async def sync_knowledge_posts(
    payload: ChannelSyncRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    from app.services.knowledge import knowledge
    if payload and payload.channel:
        clean = settings_service.clean_channel_username(payload.channel)
        count = await knowledge.sync_channel_posts(db, clean)
        await db.commit()
        return {"ok": True, "channel": clean, "synced_posts": count, "channels": {clean: count}}

    results = await knowledge.sync_all_channels(db)
    await db.commit()
    total = sum(results.values())
    channel_names = list(results.keys())
    primary = channel_names[0] if channel_names else ""
    return {"ok": True, "channel": primary, "synced_posts": total, "channels": results}



# ---------------------------------------------------------------------------
# Admin Management Endpoints
# ---------------------------------------------------------------------------

@router.get("/admins", dependencies=[Depends(require_permission("can_manage_admins"))])
async def get_admins(db: AsyncSession = Depends(get_db)):
    admins = await admin_service.list_admins(db)
    return [{
        "id": a.id,
        "telegram_user_id": a.telegram_user_id,
        "name": a.name,
        "username": a.username,
        "role": a.role,
        "permissions": a.permissions,
        "is_active": a.is_active,
        "added_by": a.added_by,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in admins]


@router.post("/admins", dependencies=[Depends(require_permission("can_manage_admins"))])
async def create_admin(
    payload: AdminCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        new_admin = await admin_service.add_admin(
            db,
            telegram_user_id=payload.telegram_user_id,
            name=payload.name,
            username=payload.username,
            role=payload.role,
            added_by=current_admin.telegram_user_id,
        )
        await db.commit()
        return {
            "ok": True,
            "admin": {
                "id": new_admin.id,
                "telegram_user_id": new_admin.telegram_user_id,
                "name": new_admin.name,
                "username": new_admin.username,
                "role": new_admin.role,
                "permissions": new_admin.permissions,
                "is_active": new_admin.is_active,
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/admins/{telegram_user_id}")
async def delete_admin(
    telegram_user_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Only owner or admins with can_manage_admins can remove admins
    if not (current_admin.role == "owner" or admin_service.has_permission(current_admin, "can_manage_admins")):
        raise HTTPException(status_code=403, detail="Admin o'chirish uchun ruxsat yo'q")
    try:
        removed = await admin_service.remove_admin(db, telegram_user_id)
        await db.commit()
        return {"ok": True, "message": f"{removed.name or removed.telegram_user_id} o'chirildi"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/admins/{telegram_user_id}/permissions")
async def update_admin_permission(
    telegram_user_id: int,
    payload: AdminUpdatePermission,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not (current_admin.role == "owner" or admin_service.has_permission(current_admin, "can_manage_admins")):
        raise HTTPException(status_code=403, detail="Ruxsatlarni o'zgartirish huquqi yo'q")
    try:
        updated = await admin_service.update_permission(db, telegram_user_id, payload.permission, payload.value)
        await db.commit()
        return {"ok": True, "permissions": updated.permissions}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch("/admins/{telegram_user_id}/role")
async def update_admin_role(
    telegram_user_id: int,
    payload: AdminUpdateRole,
    current_admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if current_admin.role != "owner":
        raise HTTPException(status_code=403, detail="Faqat owner boshqa admin rolini o'zgartira oladi")
    try:
        updated = await admin_service.update_role(db, telegram_user_id, payload.role)
        await db.commit()
        return {"ok": True, "role": updated.role, "permissions": updated.permissions}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    channel = await settings_service.get_public_channel(db)
    channels = await settings_service.list_channels(db)
    all_settings = await settings_service.list_settings(db)
    return {
        "public_channel": channel,
        "connected_channels": [{
            "id": ch.id,
            "channel_username": ch.channel_username,
            "title": ch.title or f"@{ch.channel_username}",
            "is_active": ch.is_active,
            "posts_count": ch.posts_count,
            "last_synced_at": ch.last_synced_at.isoformat() if ch.last_synced_at else None,
            "created_at": ch.created_at.isoformat() if ch.created_at else None,
        } for ch in channels],
        "settings": all_settings,
    }


@router.patch("/settings/{key}")
async def update_setting(
    key: str,
    payload: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    if not (current_admin.role == "owner" or admin_service.has_permission(current_admin, "can_manage_settings")):
        raise HTTPException(status_code=403, detail="Sozlamalarni o'zgartirish huquqi yo'q")
    try:
        if key == "public_channel":
            cleaned = await settings_service.set_public_channel(db, payload.value)
            await db.commit()
            return {"ok": True, "key": key, "value": cleaned}
        setting = await settings_service.set_setting(db, key, payload.value, description=payload.description)
        await db.commit()
        return {"ok": True, "key": setting.key, "value": setting.value}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
