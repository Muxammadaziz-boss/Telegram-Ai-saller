"""SaaS Public & Tenant Endpoints (Plans, Subscriptions, Usage, Billing, Organizations)."""

from datetime import datetime, timezone
import secrets
import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.logging import get_logger
from app.core.security import encrypt_secret
from app.models import Admin, Organization, OrganizationMember, Plan, Subscription, User
from app.services.billing_service import billing_service
from app.services.entitlement_service import entitlement_service
from app.services.telegram import get_telegram_service
from app.services.saas_service import (
    cancel_organization_subscription,
    create_organization_with_trial,
    get_organization_details,
    get_organization_subscription,
    get_user_organizations,
    resume_organization_subscription,
    upgrade_organization_plan,
)
from app.services.usage_service import usage_service

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["saas"])


# --- Schemas ---

class UpgradeRequest(BaseModel):
    new_plan_code: str
    billing_cycle: str = "monthly"  # monthly or yearly


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    slug: str | None = None
    category: str = "Retail"
    plan_code: str = "start"
    telegram_bot_token: str | None = None
    telegram_channel: str | None = None
    ai_language: str = "uz"
    ai_personality: str | None = None
    custom_system_prompt: str | None = None


class VerifyTokenRequest(BaseModel):
    token: str


class UpdateOrgRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    ai_language: str | None = None
    ai_personality: str | None = None
    custom_system_prompt: str | None = None
    telegram_bot_token: str | None = None
    openai_api_key: str | None = None
    gemini_api_key: str | None = None


class CheckoutRequest(BaseModel):
    plan_code: str
    billing_cycle: str = "monthly"
    success_url: str = "/settings/billing?status=success"
    cancel_url: str = "/settings/billing?status=cancelled"


# --- Tenant & Auth Resolvers ---

from app.api.admin import get_current_admin
from app.dependencies.auth import get_current_user
from app.dependencies.tenant import get_admin_tenant_id
from app.services import admin_service


async def resolve_organization_id(
    x_organization_id: str | None = Header(default=None),
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> int:
    """Resolve active tenant organization_id and strictly enforce verified membership."""
    return await get_admin_tenant_id(
        current_admin=admin,
        x_organization_id=x_organization_id,
        db=db,
    )


def require_saas_permission(perm: str):
    """Enforce granular RBAC permission for tenant organization actions."""
    async def dependency(
        admin: Admin = Depends(get_current_admin),
        org_id: int = Depends(resolve_organization_id),
    ) -> Admin:
        if not admin_service.has_permission(admin, perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sizda ushbu amal uchun ruxsat yo'q: {perm}",
            )
        return admin
    return dependency


# --- Endpoints ---

@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db)):
    """Public catalog of subscription plans."""
    res = await db.execute(select(Plan).where(Plan.is_active.is_(True)).order_by(Plan.price_monthly.asc()))
    plans = res.scalars().all()
    return {
        "plans": [
            {
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "description": p.description,
                "price_monthly": p.price_monthly,
                "price_yearly": p.price_yearly,
                "currency": p.currency,
                "is_featured": p.is_featured,
                "features": p.features,
                "limits": p.limits,
            }
            for p in plans
        ]
    }


@router.get("/subscription")
async def get_subscription(
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """Active subscription, plan info, trial days remaining for current tenant."""
    sub_data = await get_organization_subscription(db, org_id)
    if not sub_data:
        raise HTTPException(status_code=404, detail="Obuna ma'lumotlari topilmadi")
    return sub_data


@router.post("/subscription/upgrade")
async def upgrade_plan(
    req: UpgradeRequest,
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_billing")),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade or downgrade tenant subscription plan."""
    try:
        updated = await upgrade_organization_plan(
            db,
            organization_id=org_id,
            new_plan_code=req.new_plan_code,
            billing_cycle=req.billing_cycle,
        )
        return {"status": "success", "subscription": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subscription/cancel")
async def cancel_subscription(
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_billing")),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription at the end of current billing period."""
    try:
        updated = await cancel_organization_subscription(db, org_id)
        return {"status": "cancelled", "subscription": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/subscription/resume")
async def resume_subscription(
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_billing")),
    db: AsyncSession = Depends(get_db),
):
    """Resume a cancelled subscription before period ends."""
    try:
        updated = await resume_organization_subscription(db, org_id)
        return {"status": "active", "subscription": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/usage")
async def get_usage(
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """Usage dashboard with visual progress percentages and warning states."""
    dash = await usage_service.get_usage_dashboard(db, org_id)
    return dash


@router.get("/entitlements")
async def get_entitlements(
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """List of all feature entitlements and limits for the current tenant."""
    data = await entitlement_service.get_all_entitlements(db, org_id)
    return data


@router.get("/entitlements/check/{feature_key}")
async def check_feature_entitlement(
    feature_key: str,
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """Check a single feature entitlement for the current tenant."""
    has_it = await entitlement_service.has_feature(db, org_id, feature_key)
    return {"feature": feature_key, "has_access": has_it, "organization_id": org_id}


@router.get("/organizations")
async def list_user_organizations(
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations accessible to the authenticated user."""
    # Look up user by admin's telegram_user_id
    if admin and admin.telegram_user_id:
        u_res = await db.execute(select(User).where(User.telegram_user_id == admin.telegram_user_id))
        user = u_res.scalar_one_or_none()
        if user:
            orgs = await get_user_organizations(db, user.id)
            return {"organizations": orgs}

    if admin and admin.organization_id:
        org = await get_organization_details(db, admin.organization_id)
        return {"organizations": [org] if org else []}

    raise HTTPException(status_code=403, detail="Siz hech qaysi tashkilotga a'zo emassiz")


@router.post("/organizations")
async def create_organization(
    req: CreateOrgRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Onboarding endpoint: create a new organization with 7-day free trial."""
    org = await create_organization_with_trial(
        db,
        user=user,
        name=req.name,
        slug=req.slug or "",
        category=req.category,
        plan_code=req.plan_code,
        trial_days=7,
        telegram_bot_token=req.telegram_bot_token,
        telegram_channel=req.telegram_channel,
        ai_language=req.ai_language,
        ai_personality=req.ai_personality,
        custom_system_prompt=req.custom_system_prompt,
    )
    return {
        "status": "created",
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "category": org.category,
            "trial_days": 7,
            "telegram_bot_token_set": bool(org.telegram_bot_token),
            "webhook_secret_set": bool(org.webhook_secret),
        },
    }


@router.post("/organizations/verify-token")
async def verify_bot_token_endpoint(
    req: VerifyTokenRequest,
    user: User = Depends(get_current_user),
):
    """Verify Telegram bot token via Telegram getMe API before saving."""
    token = req.token.strip()
    if not token or ":" not in token:
        raise HTTPException(status_code=400, detail="Noto'g'ri Telegram bot token formati")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            data = resp.json()
            if not data.get("ok"):
                return {
                    "valid": False,
                    "error": data.get("description", "Noto'g'ri bot token"),
                }
            bot_info = data.get("result", {})
            return {
                "valid": True,
                "bot_id": bot_info.get("id"),
                "bot_name": bot_info.get("first_name"),
                "bot_username": bot_info.get("username"),
                "can_join_groups": bot_info.get("can_join_groups", False),
                "can_read_all_group_messages": bot_info.get("can_read_all_group_messages", False),
                "supports_inline_queries": bot_info.get("supports_inline_queries", False),
            }
        except Exception as exc:
            return {"valid": False, "error": f"Telegram API bilan bog'lanib bo'lmadi: {exc}"}


@router.post("/organizations/{org_id}/set-webhook")
async def set_org_webhook_endpoint(
    org_id: int,
    admin: Admin = Depends(require_saas_permission("can_manage_settings")),
    db: AsyncSession = Depends(get_db),
):
    """Register or refresh the Telegram webhook for the organization."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")
    if not org.decrypted_bot_token:
        raise HTTPException(status_code=400, detail="Tashkilotda bot token mavjud emas")
    if not org.webhook_secret:
        org.webhook_secret = secrets.token_urlsafe(32)
        await db.commit()

    if not settings.public_webhook_url:
        raise HTTPException(
            status_code=400,
            detail="Serverda PUBLIC_WEBHOOK_URL sozlanmagan. Iltimos, domen yoki ngrok havolasini kiriting."
        )

    webhook_url = f"{settings.public_webhook_url.rstrip('/')}/telegram/webhook/{org.slug}"
    tg_svc = get_telegram_service(org.decrypted_bot_token)
    try:
        res = await tg_svc.set_webhook(webhook_url, secret_token=org.webhook_secret)
        return {
            "status": "ok",
            "webhook_url": webhook_url,
            "secret_configured": bool(org.webhook_secret),
            "telegram_response": res,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Telegram webhook o'rnatishda xatolik: {exc}")


@router.get("/organizations/{org_id}/webhook-status")
async def get_org_webhook_status_endpoint(
    org_id: int,
    admin: Admin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Inspect current Telegram webhook status from Telegram API."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")
    if not org.decrypted_bot_token:
        return {"configured": False, "reason": "Bot token kiritilmagan"}

    tg_svc = get_telegram_service(org.decrypted_bot_token)
    try:
        info = await tg_svc.get_webhook_info()
        return {
            "configured": True,
            "has_webhook_secret": bool(org.webhook_secret),
            "webhook_info": info,
        }
    except Exception as exc:
        return {"configured": True, "error": str(exc)}


@router.get("/organizations/current")
async def get_current_organization(
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """Details and settings of currently active organization."""
    details = await get_organization_details(db, org_id)
    if not details:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")
    return details


@router.put("/organizations/current")
async def update_current_organization(
    req: UpdateOrgRequest,
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_settings")),
    db: AsyncSession = Depends(get_db),
):
    """Update settings of current organization."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")

    if req.name is not None:
        org.name = req.name.strip()
    if req.category is not None:
        org.category = req.category.strip()
    if req.ai_language is not None:
        org.ai_language = req.ai_language.strip()
    if req.ai_personality is not None:
        org.ai_personality = req.ai_personality.strip()
    if req.custom_system_prompt is not None:
        org.custom_system_prompt = req.custom_system_prompt.strip() or None
    if req.telegram_bot_token is not None:
        tok = req.telegram_bot_token.strip() or None
        org.telegram_bot_token = encrypt_secret(tok) if tok else None
        if tok and not org.webhook_secret:
            org.webhook_secret = secrets.token_urlsafe(32)
    if req.openai_api_key is not None:
        k = req.openai_api_key.strip() or None
        org.openai_api_key = encrypt_secret(k) if k else None
    if req.gemini_api_key is not None:
        k = req.gemini_api_key.strip() or None
        org.gemini_api_key = encrypt_secret(k) if k else None

    await db.commit()
    await db.refresh(org)
    return {"status": "updated", "organization": await get_organization_details(db, org_id)}


# --- Billing Endpoints ---

@router.post("/billing/checkout")
async def create_checkout(
    req: CheckoutRequest,
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_billing")),
    db: AsyncSession = Depends(get_db),
):
    """Create a checkout session (Stripe or Mock provider)."""
    sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == org_id))
    sub = sub_res.scalar_one_or_none()
    provider_name = sub.provider if sub else "mock"

    res = await billing_service.create_checkout_session(
        provider_name=provider_name,
        organization_id=org_id,
        plan_code=req.plan_code,
        billing_cycle=req.billing_cycle,
        success_url=req.success_url,
        cancel_url=req.cancel_url,
    )
    return res


@router.post("/billing/portal")
async def customer_portal(
    org_id: int = Depends(resolve_organization_id),
    admin: Admin = Depends(require_saas_permission("can_manage_billing")),
    db: AsyncSession = Depends(get_db),
):
    """Redirect URL to Stripe Customer Portal or Mock Portal."""
    sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == org_id))
    sub = sub_res.scalar_one_or_none()
    provider_name = sub.provider if sub else "mock"
    customer_id = sub.provider_customer_id if sub else f"mock_cust_{org_id}"

    res = await billing_service.create_customer_portal_session(
        provider_name=provider_name,
        customer_id=customer_id or f"mock_cust_{org_id}",
        return_url="/settings/billing",
    )
    return res


@router.get("/billing/invoices")
async def list_invoices(
    org_id: int = Depends(resolve_organization_id),
    db: AsyncSession = Depends(get_db),
):
    """List recent invoices for the tenant organization."""
    sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == org_id))
    sub = sub_res.scalar_one_or_none()
    provider_name = sub.provider if sub else "mock"
    customer_id = sub.provider_customer_id if sub else f"mock_cust_{org_id}"

    invoices = await billing_service.list_invoices(
        provider_name=provider_name,
        customer_id=customer_id or f"mock_cust_{org_id}",
    )
    return {"invoices": invoices}


@router.post("/billing/webhook")
async def billing_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Idempotent billing webhook endpoint."""
    body = await request.body()
    try:
        result = await billing_service.process_billing_webhook_idempotent(
            db=db,
            provider="stripe",
            payload_raw=body,
            signature_header=stripe_signature,
        )
        return result
    except Exception as e:
        logger.exception("Billing webhook xatolik: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

