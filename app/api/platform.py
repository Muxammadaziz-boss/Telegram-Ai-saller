"""Platform Owner Endpoints (Financial Metrics, Tenant Portfolio, Profitability, Cost Control)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import get_current_admin
from app.core.config import settings
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Admin, AuditLog, Organization, Plan, User
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
    admin: Admin = Depends(require_platform_owner),
    db: AsyncSession = Depends(get_db),
):
    """Detailed tenant portfolio list with plan status, AI messages, AI cost, and profit margin."""
    orgs = await cost_service.get_organization_profitability_list(db)
    return {"organizations": orgs}


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

