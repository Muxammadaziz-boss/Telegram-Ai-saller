"""Centralized Usage Metering, Tracking and Limit Enforcement Service."""

from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import (
    ConnectedChannel,
    Conversation,
    Customer,
    Order,
    OrganizationMember,
    Plan,
    Product,
    Subscription,
    UsageRecord,
)


def current_period_key() -> str:
    """Return period formatted as YYYY-MM."""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m")


# Human-friendly labels and icons for metrics
METRIC_DEFINITIONS = {
    "ai_messages": {
        "name": "AI Xabarlar",
        "description": "Oy davomida sun'iy intellekt tomonidan mijozlarga yozilgan xabarlar",
        "unit": "ta",
        "is_monthly": True,
    },
    "ai_conversations": {
        "name": "Faol Suhbatlar",
        "description": "Oy davomida AI ishtirok etgan mijoz suhbatlari",
        "unit": "ta",
        "is_monthly": True,
    },
    "knowledge_posts": {
        "name": "Kanal Postlari (Bilimlar)",
        "description": "Telegram kanalidan import qilingan va AI xotirasidagi postlar soni",
        "unit": "ta",
        "is_monthly": False,
    },
    "products": {
        "name": "Mahsulotlar",
        "description": "Katalogdagi faol mahsulotlar soni",
        "unit": "ta",
        "is_monthly": False,
    },
    "customers": {
        "name": "Mijozlar Bazasi",
        "description": "Tizimda saqlanayotgan mijozlar soni",
        "unit": "ta",
        "is_monthly": False,
    },
    "monthly_orders": {
        "name": "Oylik Buyurtmalar",
        "description": "Oy davomida shakllangan barcha buyurtmalar soni",
        "unit": "ta",
        "is_monthly": True,
    },
    "team_members": {
        "name": "Jamoa A'zolari",
        "description": "Tashkilotga biriktirilgan operator va adminlar",
        "unit": "ta",
        "is_monthly": False,
    },
    "telegram_connections": {
        "name": "Telegram Business Ulanishlar",
        "description": "Ulangan Telegram Business akkauntlar",
        "unit": "ta",
        "is_monthly": False,
    },
    "telegram_channels": {
        "name": "Ulangan Kanallar",
        "description": "Mahsulotlar bazasi uchun sinxronlanayotgan Telegram kanallari",
        "unit": "ta",
        "is_monthly": False,
    },
}


class LimitExceededException(HTTPException):
    def __init__(self, metric: str, used: int, limit: int, required_plan: str = "PRO"):
        metric_name = METRIC_DEFINITIONS.get(metric, {}).get("name", metric)
        detail = {
            "error": "LIMIT_EXCEEDED",
            "metric": metric,
            "metric_name": metric_name,
            "used": used,
            "limit": limit,
            "required_plan": required_plan.upper(),
            "message": f"'{metric_name}' bo'yicha limitga yetildi ({used} / {limit}). Iltimos, {required_plan.upper()} tarifiga o'ting.",
        }
        super().__init__(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=detail)


async def get_org_plan_limits(db: AsyncSession, organization_id: int) -> tuple[dict, str]:
    """Fetch limits dictionary and plan code for the organization."""
    res = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.organization_id == organization_id)
    )
    row = res.first()
    if row:
        _sub, plan = row
        return (plan.limits or {}), plan.code

    # Default fallback to START limits
    plan_res = await db.execute(select(Plan).where(Plan.code == "start"))
    start_plan = plan_res.scalar_one_or_none()
    if start_plan:
        return (start_plan.limits or {}), "start"
    return {}, "start"


async def get_or_create_usage_record(
    db: AsyncSession, organization_id: int, metric: str, period: str | None = None
) -> UsageRecord:
    """Fetch or initialize usage record for the given metric and period."""
    p = period or current_period_key()
    res = await db.execute(
        select(UsageRecord).where(
            UsageRecord.organization_id == organization_id,
            UsageRecord.metric == metric,
            UsageRecord.period == p,
        )
    )
    record = res.scalar_one_or_none()
    if not record:
        limits, _code = await get_org_plan_limits(db, organization_id)
        metric_limit = limits.get(metric, 1000)
        record = UsageRecord(
            organization_id=organization_id,
            metric=metric,
            period=p,
            used=0,
            limit=metric_limit,
        )
        db.add(record)
        await db.flush()
    return record


async def check_limit(
    db: AsyncSession, organization_id: int, metric: str, amount: int = 1
) -> tuple[bool, int, int]:
    """Check if adding amount exceeds the configured limit. Returns (allowed, used, limit)."""
    limits, plan_code = await get_org_plan_limits(db, organization_id)
    limit = limits.get(metric)
    if limit is None:
        return True, 0, 999999

    # Uncapped or Fair Use high limits
    if limit == -1 or limit >= 999999:
        return True, 0, limit

    is_monthly = METRIC_DEFINITIONS.get(metric, {}).get("is_monthly", True)
    if is_monthly:
        rec = await get_or_create_usage_record(db, organization_id, metric)
        used = rec.used
    else:
        # Entity-based counts
        used = await get_actual_entity_count(db, organization_id, metric)

    if (used + amount) > limit:
        return False, used, limit
    return True, used, limit


async def require_limit(db: AsyncSession, organization_id: int, metric: str, amount: int = 1):
    """Enforce limit. Raises LimitExceededException if exceeded."""
    allowed, used, limit = await check_limit(db, organization_id, metric, amount)
    if not allowed:
        _limits, plan_code = await get_org_plan_limits(db, organization_id)
        next_plan = "pro" if plan_code == "start" else "ultra"
        raise LimitExceededException(metric, used, limit, required_plan=next_plan)
    return True


async def increment_usage(
    db: AsyncSession, organization_id: int, metric: str, amount: int = 1
) -> UsageRecord:
    """Safely increments usage counter for monthly or tracked metric."""
    rec = await get_or_create_usage_record(db, organization_id, metric)
    rec.used += amount
    limits, _ = await get_org_plan_limits(db, organization_id)
    if metric in limits:
        rec.limit = limits[metric]
    await db.flush()
    return rec


async def get_actual_entity_count(db: AsyncSession, organization_id: int, metric: str) -> int:
    """Calculate direct count for non-metered entities."""
    if metric == "products":
        res = await db.scalar(
            select(func.count(Product.id)).where(
                Product.organization_id == organization_id,
                Product.is_active.is_(True),
            )
        )
        return res or 0
    elif metric == "customers":
        res = await db.scalar(
            select(func.count(Customer.id)).where(Customer.organization_id == organization_id)
        )
        return res or 0
    elif metric == "team_members":
        res = await db.scalar(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.is_active.is_(True),
            )
        )
        return res or 0
    elif metric == "telegram_channels":
        res = await db.scalar(
            select(func.count(ConnectedChannel.id)).where(
                ConnectedChannel.organization_id == organization_id,
                ConnectedChannel.is_active.is_(True),
            )
        )
        return res or 0
    elif metric == "monthly_orders":
        rec = await get_or_create_usage_record(db, organization_id, "monthly_orders")
        return rec.used
    elif metric == "knowledge_posts":
        from app.models import ChannelPost
        res = await db.scalar(
            select(func.count(ChannelPost.id)).where(ChannelPost.organization_id == organization_id)
        )
        return res or 0
    return 0


async def get_usage_dashboard(db: AsyncSession, organization_id: int) -> dict:
    """Return comprehensive usage status with percentage and progress state for all metrics."""
    limits, plan_code = await get_org_plan_limits(db, organization_id)
    period = current_period_key()

    items = []
    for metric_key, info in METRIC_DEFINITIONS.items():
        limit = limits.get(metric_key, 1000)
        is_monthly = info["is_monthly"]

        if is_monthly:
            rec = await get_or_create_usage_record(db, organization_id, metric_key, period)
            used = rec.used
        else:
            used = await get_actual_entity_count(db, organization_id, metric_key)

        percent = int((used / limit * 100)) if limit > 0 else 0
        if percent >= 100:
            status_level = "exceeded"
        elif percent >= 90:
            status_level = "critical"
        elif percent >= 70:
            status_level = "warning"
        else:
            status_level = "normal"

        items.append({
            "metric": metric_key,
            "name": info["name"],
            "description": info["description"],
            "unit": info["unit"],
            "is_monthly": is_monthly,
            "used": used,
            "limit": limit,
            "percentage": min(percent, 100),
            "raw_percentage": percent,
            "status": status_level,  # normal, warning, critical, exceeded
        })

    # Token and cost tracking
    in_tokens_rec = await get_or_create_usage_record(db, organization_id, "input_tokens", period)
    out_tokens_rec = await get_or_create_usage_record(db, organization_id, "output_tokens", period)
    micros_rec = await get_or_create_usage_record(db, organization_id, "estimated_ai_cost_micros", period)
    if micros_rec.used > 0:
        estimated_cost_usd = round(micros_rec.used / 1_000_000.0, 4)
    else:
        cost_rec = await get_or_create_usage_record(db, organization_id, "estimated_ai_cost_cents", period)
        estimated_cost_usd = round(cost_rec.used / 100.0, 4)

    return {
        "organization_id": organization_id,
        "period": period,
        "plan_code": plan_code,
        "items": items,
        "tokens": {
            "input_tokens": in_tokens_rec.used,
            "output_tokens": out_tokens_rec.used,
            "total_tokens": in_tokens_rec.used + out_tokens_rec.used,
            "estimated_cost_usd": estimated_cost_usd,
        },
    }


class UsageService:
    @staticmethod
    async def get_usage_dashboard(db: AsyncSession, organization_id: int) -> dict:
        return await get_usage_dashboard(db, organization_id)

    @staticmethod
    async def check_limit(db: AsyncSession, organization_id: int, metric: str, increment: int = 1) -> dict:
        allowed, used, limit = await check_limit(db, organization_id, metric, increment)
        return {"allowed": allowed, "used": used, "limit": limit}

    @staticmethod
    async def require_limit(db: AsyncSession, organization_id: int, metric: str, increment: int = 1) -> bool:
        return await require_limit(db, organization_id, metric, increment)

    @staticmethod
    async def increment_usage(db: AsyncSession, organization_id: int, metric: str, count: int = 1, period: str | None = None):
        return await increment_usage(db, organization_id, metric, count, period)

    @staticmethod
    async def get_actual_entity_count(db: AsyncSession, organization_id: int, metric: str) -> int:
        return await get_actual_entity_count(db, organization_id, metric)


usage_service = UsageService()

