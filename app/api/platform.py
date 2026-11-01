"""Platform Owner Endpoints (Financial Metrics, Tenant Portfolio, Profitability, Cost Control)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import get_current_admin
from app.core.db import get_db
from app.core.logging import get_logger
from app.models import Admin, AuditLog, Plan
from app.services.cost_service import cost_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api/platform", tags=["platform"])


def require_platform_owner(admin: Admin = Depends(get_current_admin)) -> Admin:
    """Ensure user is platform owner or master admin."""
    if admin.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faqat Platforma egasi (Platform Owner) kirishi mumkin",
        )
    return admin


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

