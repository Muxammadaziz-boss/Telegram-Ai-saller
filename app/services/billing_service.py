"""Provider-Agnostic SaaS Billing & Subscription Management Service."""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.models import AuditLog, Organization, Plan, Subscription, WebhookEvent

logger = get_logger(__name__)


class BillingProvider(ABC):
    """Abstract interface for payment gateways (Stripe, Payme, Click, Lemon Squeezy)."""

    @abstractmethod
    async def create_checkout_session(
        self,
        organization: Organization,
        plan: Plan,
        billing_cycle: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        pass

    @abstractmethod
    async def cancel_subscription(self, subscription: Subscription) -> bool:
        pass

    @abstractmethod
    async def change_plan(self, subscription: Subscription, new_plan: Plan, billing_cycle: str) -> bool:
        pass


class MockBillingProvider(BillingProvider):
    """Local simulation provider for test checkouts, trials, and offline billing."""

    async def create_checkout_session(
        self,
        organization: Organization,
        plan: Plan,
        billing_cycle: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        session_id = f"mock_chk_{organization.id}_{plan.code}_{int(datetime.now().timestamp())}"
        return {
            "session_id": session_id,
            "url": f"{success_url}?session_id={session_id}&plan={plan.code}&cycle={billing_cycle}",
            "provider": "mock",
        }

    async def cancel_subscription(self, subscription: Subscription) -> bool:
        return True

    async def change_plan(self, subscription: Subscription, new_plan: Plan, billing_cycle: str) -> bool:
        return True


class StripeBillingProvider(BillingProvider):
    """Stripe API integration."""

    def __init__(self, api_key: str):
        self.api_key = api_key

    async def create_checkout_session(
        self,
        organization: Organization,
        plan: Plan,
        billing_cycle: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        # If no stripe key is configured in dev, fallback to mock simulation
        if not self.api_key:
            mock = MockBillingProvider()
            return await mock.create_checkout_session(organization, plan, billing_cycle, success_url, cancel_url)

        import httpx
        amount = (plan.price_yearly * 100) if billing_cycle == "yearly" else (plan.price_monthly * 100)
        interval = "year" if billing_cycle == "yearly" else "month"

        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "success_url": success_url + "?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": cancel_url,
            "payment_method_types[0]": "card",
            "mode": "subscription",
            "client_reference_id": str(organization.id),
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][product_data][name]": f"AI Sales - {plan.name} Plan",
            "line_items[0][price_data][unit_amount]": str(amount),
            "line_items[0][price_data][recurring][interval]": interval,
            "line_items[0][quantity]": "1",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post("https://api.stripe.com/v1/checkout/sessions", data=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            return {"session_id": data["id"], "url": data["url"], "provider": "stripe"}

    async def cancel_subscription(self, subscription: Subscription) -> bool:
        return True

    async def change_plan(self, subscription: Subscription, new_plan: Plan, billing_cycle: str) -> bool:
        return True


def get_billing_provider() -> BillingProvider:
    """Return configured billing provider."""
    stripe_key = getattr(settings, "stripe_secret_key", None)
    if stripe_key:
        return StripeBillingProvider(stripe_key)
    return MockBillingProvider()


# ============================================================================
# SUBSCRIPTION LIFECYCLE MANAGEMENT
# ============================================================================

async def upgrade_organization_plan(
    db: AsyncSession,
    organization_id: int,
    new_plan_code: str,
    billing_cycle: str = "monthly",
    user_id: int | None = None,
) -> Subscription:
    """Immediately upgrades organization plan, resets limits, and activates subscription."""
    res = await db.execute(select(Plan).where(Plan.code == new_plan_code))
    new_plan = res.scalar_one_or_none()
    if not new_plan:
        raise ValueError(f"Tarif topilmadi: {new_plan_code}")

    sub_res = await db.execute(
        select(Subscription).where(Subscription.organization_id == organization_id)
    )
    sub = sub_res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    period_days = 365 if billing_cycle == "yearly" else 30

    if not sub:
        sub = Subscription(
            organization_id=organization_id,
            plan_id=new_plan.id,
            status="active",
            billing_cycle=billing_cycle,
            provider="mock",
            started_at=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=period_days),
        )
        db.add(sub)
    else:
        old_plan_id = sub.plan_id
        sub.plan_id = new_plan.id
        sub.status = "active"
        sub.billing_cycle = billing_cycle
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=period_days)
        sub.cancel_at_period_end = False

    # Audit log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="subscription_upgrade",
        resource="subscription",
        resource_id=str(sub.id or organization_id),
        metadata_json={
            "new_plan": new_plan.code,
            "billing_cycle": billing_cycle,
            "price": new_plan.price_yearly if billing_cycle == "yearly" else new_plan.price_monthly,
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(sub)
    return sub


async def cancel_organization_subscription(
    db: AsyncSession, organization_id: int, user_id: int | None = None
) -> Subscription:
    """Mark subscription to cancel at period end without destroying data or immediate access."""
    sub_res = await db.execute(
        select(Subscription).where(Subscription.organization_id == organization_id)
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        raise ValueError("Obuna topilmadi")

    sub.cancel_at_period_end = True
    sub.cancelled_at = datetime.now(timezone.utc)

    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="subscription_cancel_scheduled",
        resource="subscription",
        resource_id=str(sub.id),
        metadata_json={"cancel_at": sub.current_period_end.isoformat()},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(sub)
    return sub


async def resume_organization_subscription(
    db: AsyncSession, organization_id: int, user_id: int | None = None
) -> Subscription:
    """Resume a scheduled cancellation."""
    sub_res = await db.execute(
        select(Subscription).where(Subscription.organization_id == organization_id)
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        raise ValueError("Obuna topilmadi")

    sub.cancel_at_period_end = False
    sub.cancelled_at = None

    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="subscription_resumed",
        resource="subscription",
        resource_id=str(sub.id),
    )
    db.add(audit)
    await db.commit()
    await db.refresh(sub)
    return sub


async def process_billing_webhook_idempotent(
    db: AsyncSession,
    provider: str,
    event_id: str,
    event_type: str,
    payload: dict,
) -> tuple[bool, str]:
    """Process incoming billing webhook idempotently. Returns (is_new, status)."""
    # 1. Check idempotency
    existing = await db.execute(
        select(WebhookEvent).where(
            WebhookEvent.provider == provider,
            WebhookEvent.event_id == event_id,
        )
    )
    if existing.scalar_one_or_none():
        logger.info("Webhook %s:%s already processed (idempotent skipped)", provider, event_id)
        return False, "already_processed"

    event_record = WebhookEvent(
        provider=provider,
        event_id=event_id,
        event_type=event_type,
        payload=payload,
        status="pending",
    )
    db.add(event_record)
    await db.flush()

    try:
        # Route standard event types
        if event_type in ("checkout.session.completed", "payment_succeeded"):
            org_id_str = payload.get("client_reference_id") or payload.get("organization_id")
            plan_code = payload.get("plan_code", "pro")
            cycle = payload.get("billing_cycle", "monthly")
            if org_id_str:
                await upgrade_organization_plan(db, int(org_id_str), plan_code, cycle)

        elif event_type in ("customer.subscription.deleted", "subscription_expired"):
            org_id_str = payload.get("organization_id")
            if org_id_str:
                sub_res = await db.execute(select(Subscription).where(Subscription.organization_id == int(org_id_str)))
                sub = sub_res.scalar_one_or_none()
                if sub:
                    sub.status = "expired"

        event_record.status = "processed"
        event_record.processed_at = datetime.now(timezone.utc)
        await db.commit()
        return True, "processed"

    except Exception as exc:
        logger.exception("Error processing webhook %s:%s", provider, event_id)
        event_record.status = "failed"
        event_record.error_message = str(exc)
        await db.commit()
        return True, f"failed: {exc}"


class BillingService:
    @staticmethod
    def get_provider(provider_name: str = "mock") -> BillingProvider:
        stripe_key = getattr(settings, "stripe_secret_key", None)
        if provider_name == "stripe" and stripe_key:
            return StripeBillingProvider(stripe_key)
        return MockBillingProvider()

    async def create_checkout_session(
        self,
        provider_name: str,
        organization_id: int,
        plan_code: str,
        billing_cycle: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        session_id = f"chk_{organization_id}_{plan_code}_{int(datetime.now().timestamp())}"
        return {
            "session_id": session_id,
            "url": f"{success_url}&session_id={session_id}&plan={plan_code}&cycle={billing_cycle}",
            "provider": provider_name,
        }

    async def create_customer_portal_session(self, provider_name: str, customer_id: str, return_url: str) -> dict:
        return {
            "url": f"{return_url}?portal=mock&customer={customer_id}",
            "provider": provider_name,
        }

    async def list_invoices(self, provider_name: str, customer_id: str) -> list[dict]:
        now = datetime.now(timezone.utc)
        return [
            {
                "id": f"inv_{customer_id}_1",
                "number": "INV-2026-001",
                "amount": 59.0,
                "currency": "USD",
                "status": "paid",
                "paid_at": now.isoformat(),
                "download_url": "#",
            }
        ]

    async def process_billing_webhook_idempotent(
        self,
        db: AsyncSession,
        provider: str,
        payload_raw: bytes,
        signature_header: str | None,
    ) -> dict:
        import json
        try:
            payload = json.loads(payload_raw.decode("utf-8"))
        except Exception:
            payload = {}
        event_id = payload.get("id") or f"mock_evt_{int(datetime.now().timestamp())}"
        event_type = payload.get("type") or "checkout.session.completed"
        is_new, status = await process_billing_webhook_idempotent(db, provider, event_id, event_type, payload)
        return {"ok": True, "event_id": event_id, "status": status}


billing_service = BillingService()

