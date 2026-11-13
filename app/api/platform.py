"""Platform Owner Endpoints (Financial Metrics, Tenant Portfolio, Profitability, Cost Control)."""

from datetime import datetime, timedelta, timezone
import re
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
import httpx
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import get_current_admin
from app.core.config import settings
from app.core.db import get_db
from app.core.logging import get_logger
from app.core.security import encrypt_secret, hash_password
from app.models import Admin, AuditLog, Organization, OrganizationMember, Plan, Subscription, SystemSetting, User
from app.services.cost_service import cost_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/platform", tags=["platform"])


async def require_platform_owner(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    """Ensure user is true platform owner or master admin.

    Checks:
    1. Runtime _is_platform_owner flag attached by auth dependency.
    2. Admin telegram user ID matching settings.admin_telegram_id.
    3. User.is_platform_owner == True in database.
    Rejects tenant owners whose role is merely 'owner' in their local organization.
    """
    if getattr(admin, "_is_platform_owner", False):
        return admin

    if settings.admin_telegram_id and admin.telegram_user_id == settings.admin_telegram_id:
        return admin

    user = await db.get(User, admin.id)
    if user and user.is_platform_owner:
        return admin

    if admin.telegram_user_id:
        u_res = await db.execute(select(User).where(User.telegram_user_id == admin.telegram_user_id))
        u = u_res.scalar_one_or_none()
        if u and u.is_platform_owner:
            return admin

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Faqat Platforma egasi (Platform Owner) kirishi mumkin",
    )


class PlanUpdateRequest(BaseModel):
    price_monthly: int | None = None
    price_yearly: int | None = None
    features: dict | None = None
    limits: dict | None = None
    is_featured: bool | None = None


class OrganizationCreateRequest(BaseModel):
    name: str
    slug: str
    category: str | None = "Retail"
    currency: str | None = "UZS"
    plan_code: str | None = "start"
    owner_email: str
    owner_password: str | None = None
    telegram_bot_token: str | None = None
    system_prompt: str | None = None


class OrganizationStatusUpdateRequest(BaseModel):
    status: str  # active, suspended, archived


@router.get("/metrics")
async def get_financial_metrics(
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform-level financial metrics: MRR, ARR, ARPU, AI API costs, and gross margin %."""
    metrics = await cost_service.get_platform_financial_metrics(db)
    return metrics


@router.get("/organizations")
async def get_organizations_profitability(
    limit: int = 100,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Detailed tenant portfolio list with plan status, AI messages, AI cost, and profit margin."""
    orgs = await cost_service.get_organization_profitability_list(db, limit=limit)
    return {"organizations": orgs}


@router.post("/organizations", status_code=status.HTTP_201_CREATED)
async def create_organization_as_owner(
    req: OrganizationCreateRequest,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform owner onboards a new merchant store / tenant with its bot and initial settings."""
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Do'kon nomi kiritilishi shart")

    clean_slug = re.sub(r"[^a-z0-9_-]", "", req.slug.strip().lower().replace(" ", "-"))
    if not clean_slug or len(clean_slug) < 2:
        raise HTTPException(status_code=400, detail="Do'kon qisqa nomi (slug) kamida 2 ta harf yoki raqamdan iborat bo'lishi kerak")

    # Check slug uniqueness
    res = await db.execute(select(Organization).where(Organization.slug == clean_slug))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"'{clean_slug}' nomli do'kon allaqachon mavjud. Boshqa slug tanlang.")

    # Validate & encrypt Telegram Bot Token if provided
    encrypted_token = None
    bot_username = None
    clean_token = req.telegram_bot_token.strip() if req.telegram_bot_token else None
    if clean_token:
        if ":" not in clean_token:
            raise HTTPException(status_code=400, detail="Telegram bot token noto'g'ri formatda (masalan: 123456789:ABCdef...)")

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                tg_res = await client.get(f"https://api.telegram.org/bot{clean_token}/getMe")
                if tg_res.status_code == 200:
                    tg_data = tg_res.json()
                    if tg_data.get("ok"):
                        bot_username = tg_data["result"].get("username")
        except Exception as e:
            logger.warning("Telegram bot verification warning: %s", e)

        encrypted_token = encrypt_secret(clean_token)

    webhook_sec = secrets.token_hex(24)

    # 1. Create Organization
    org = Organization(
        name=clean_name,
        slug=clean_slug,
        category=req.category or "Retail",
        status="active",
        telegram_bot_token=encrypted_token,
        webhook_secret=webhook_sec,
        ai_language="uz",
        ai_personality="Professional & Courteous",
        custom_system_prompt=req.system_prompt or "Siz do'konning rasmiy AI sotuvchi assistentisiz. Mijozlarga xushmuomala javob bering.",
    )
    db.add(org)
    await db.flush()

    # 2. Create or find store owner User
    clean_email = req.owner_email.strip().lower()
    user_res = await db.execute(select(User).where(User.email == clean_email))
    owner_user = user_res.scalar_one_or_none()
    plain_password = req.owner_password or secrets.token_urlsafe(10)

    if not owner_user:
        owner_user = User(
            email=clean_email,
            full_name=f"{clean_name} Egasi",
            hashed_password=hash_password(plain_password),
            is_platform_owner=False,
            is_active=True,
        )
        db.add(owner_user)
        await db.flush()

    # 3. Add Organization Member
    mem = OrganizationMember(
        organization_id=org.id,
        user_id=owner_user.id,
        role="owner",
        is_active=True,
    )
    db.add(mem)

    # 4. Attach Plan & Subscription
    target_plan_code = (req.plan_code or "start").lower()
    plan_res = await db.execute(select(Plan).where(Plan.code == target_plan_code))
    plan = plan_res.scalar_one_or_none()
    if not plan:
        p_res = await db.execute(select(Plan).where(Plan.code == "start"))
        plan = p_res.scalar_one_or_none()

    sub = Subscription(
        organization_id=org.id,
        plan_id=plan.id if plan else 1,
        status="active",
        billing_cycle="monthly",
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub)

    # 5. Currency setting
    currency_val = (req.currency or "UZS").upper()
    db.add(SystemSetting(
        key=f"store_currency_{org.id}",
        organization_id=org.id,
        value=currency_val,
        description="Do'kon asosiy hisob-kitob valyutasi",
    ))

    # 6. Audit Log
    real_user_id = getattr(admin, "_user", None).id if getattr(admin, "_user", None) else admin.id
    audit = AuditLog(
        organization_id=org.id,
        user_id=real_user_id,
        action="create_organization",
        resource="organization",
        resource_id=str(org.id),
        metadata_json={
            "created_by": admin.name,
            "store_name": clean_name,
            "store_slug": clean_slug,
            "owner_email": clean_email,
            "plan": target_plan_code,
            "bot_username": bot_username,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(org)

    # 7. Configure Telegram webhook if token and base URL are present
    webhook_url = f"{settings.public_webhook_url.rstrip('/')}/api/webhooks/telegram/{org.slug}" if settings.public_webhook_url else None
    if clean_token and webhook_url:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                await client.post(
                    f"https://api.telegram.org/bot{clean_token}/setWebhook",
                    json={"url": webhook_url, "secret_token": webhook_sec},
                )
        except Exception as e:
            logger.warning("setWebhook warning for org %s: %s", org.slug, e)

    return {
        "status": "created",
        "message": f"'{clean_name}' do'koni muvaffaqiyatli ochildi!",
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "category": org.category,
            "status": org.status,
            "bot_username": bot_username,
            "owner_email": clean_email,
            "temporary_password": plain_password if not req.owner_password else None,
            "plan": target_plan_code.upper(),
            "currency": currency_val,
        },
    }


@router.patch("/organizations/{org_id}/status")
async def update_organization_status(
    org_id: int,
    req: OrganizationStatusUpdateRequest,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Suspend, activate, or archive an organization."""
    if req.status not in ["active", "suspended", "archived"]:
        raise HTTPException(status_code=400, detail="Status 'active', 'suspended' yoki 'archived' bo'lishi kerak")

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Do'kon topilmadi")

    old_status = org.status
    org.status = req.status

    audit = AuditLog(
        organization_id=org.id,
        action="update_organization_status",
        resource="organization",
        resource_id=str(org.id),
        metadata_json={
            "admin_name": admin.name,
            "old_status": old_status,
            "new_status": req.status,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(org)

    return {
        "status": "updated",
        "organization_id": org.id,
        "new_status": org.status,
        "message": f"Do'kon holati '{req.status}' ga o'zgartirildi",
    }


@router.delete("/organizations/{org_id}")
async def delete_organization(
    org_id: int,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform Owner permanently deletes a tenant organization and its cascaded data."""
    if org_id == 1:
        raise HTTPException(status_code=400, detail="Birlamchi (asosiy) do'konni o'chirish mumkin emas")

    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Do'kon topilmadi")

    org_name = org.name
    audit = AuditLog(
        organization_id=None,
        action="delete_organization",
        resource="organization",
        resource_id=str(org.id),
        metadata_json={
            "admin_name": admin.name,
            "deleted_org_name": org_name,
            "deleted_org_slug": org.slug,
        },
    )
    db.add(audit)
    await db.delete(org)
    await db.commit()

    return {
        "status": "deleted",
        "organization_id": org_id,
        "message": f"'{org_name}' do'koni va uning barcha ma'lumotlari o'chirildi",
    }


@router.put("/plans/{plan_code}")
async def update_plan_configuration(
    plan_code: str,
    req: PlanUpdateRequest,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform owner can configure plan pricing and limits dynamically."""
    res = await db.execute(select(Plan).where(Plan.code == plan_code.lower()))
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Bunday tarif rejasi topilmadi")

    if req.price_monthly is not None:
        plan.price_monthly = req.price_monthly
    if req.price_yearly is not None:
        plan.price_yearly = req.price_yearly
    if req.features is not None:
        plan.features = {**plan.features, **req.features}
    if req.limits is not None:
        plan.limits = {**plan.limits, **req.limits}
    if req.is_featured is not None:
        plan.is_featured = req.is_featured

    # Log audit entry
    audit = AuditLog(
        organization_id=None,
        action="update_plan",
        resource="plan",
        resource_id=plan.code,
        metadata_json={
            "admin_name": admin.name,
            "updated_fields": req.model_dump(exclude_unset=True),
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(plan)

    return {
        "status": "updated",
        "plan": {
            "code": plan.code,
            "name": plan.name,
            "price_monthly": plan.price_monthly,
            "price_yearly": plan.price_yearly,
            "is_featured": plan.is_featured,
            "features": plan.features,
            "limits": plan.limits,
        },
    }


@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide audit log for compliance and security tracking."""
    res = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 100))
    )
    logs = res.scalars().all()
    return {
        "logs": [
            {
                "id": log.id,
                "organization_id": log.organization_id,
                "action": log.action,
                "resource": log.resource,
                "resource_id": log.resource_id,
                "metadata": log.metadata_json,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.post("/organizations/{org_slug}/impersonate")
async def impersonate_organization(
    org_slug: str,
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Platform Owner enters a specific tenant store (audit logged)."""
    res = await db.execute(select(Organization).where(Organization.slug == org_slug.lower()))
    org = res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Do'kon topilmadi")

    # Log audit entry
    real_user_id = getattr(admin, "_user", None).id if getattr(admin, "_user", None) else admin.id
    audit = AuditLog(
        organization_id=org.id,
        user_id=real_user_id,
        action="platform_owner_enter_store",
        resource="organization",
        resource_id=str(org.id),
        metadata_json={
            "impersonated_by_user_id": real_user_id,
            "admin_name": admin.name,
            "store_name": org.name,
            "store_slug": org.slug,
        },
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "ok",
        "message": f"{org.name} do'koniga Platform Owner ko'rinishida muvaffaqiyatli kirildi",
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "category": org.category,
            "status": org.status,
            "ai_language": org.ai_language,
            "ai_personality": org.ai_personality,
        },
    }


@router.get("/users")
async def get_all_users(
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users across the platform."""
    res = await db.execute(select(User).order_by(User.created_at.desc()))
    users = res.scalars().all()
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "telegram_user_id": u.telegram_user_id,
                "is_platform_owner": u.is_platform_owner,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


@router.get("/system-health")
async def get_system_health(
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Check system health, database, storage, and bot setup."""
    from sqlalchemy import text
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "app_env": settings.app_env,
        "version": "0.1.0",
        "gemini_configured": bool(settings.gemini_api_key),
        "openai_configured": bool(settings.openai_api_key),
        "telegram_configured": bool(settings.telegram_bot_token),
    }

