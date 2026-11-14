"""AI Cost Tracking, Financial Metrics (MRR, ARR, ARPU) and Margin Analysis."""

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Conversation, Organization, Plan, Subscription, UsageRecord


# Pricing per 1,000,000 tokens in USD (reference float table)
MODEL_PRICING = {
    "gemini-3.1-flash-lite": {"input_per_m": 0.075, "output_per_m": 0.30},
    "gemini-3.5-flash": {"input_per_m": 0.15, "output_per_m": 0.60},
    "gemini-3.8-flash": {"input_per_m": 1.25, "output_per_m": 5.00},
    "gemini-embedding-001": {"input_per_m": 0.02, "output_per_m": 0.0},
    "default": {"input_per_m": 0.15, "output_per_m": 0.60},
}

# Pricing per 1,000,000 tokens in Micro-USD (1 USD = 1,000,000 micro-USD; 1 cent = 10,000 micro-USD)
# Scaled to eliminate floating-point drift and sub-cent rounding error.
MODEL_PRICING_MICROS = {
    "gemini-3.1-flash-lite": {"input_micros_per_m": 75_000, "output_micros_per_m": 300_000},
    "gemini-3.5-flash": {"input_micros_per_m": 150_000, "output_micros_per_m": 600_000},
    "gemini-3.8-flash": {"input_micros_per_m": 1_250_000, "output_micros_per_m": 5_000_000},
    "gemini-embedding-001": {"input_micros_per_m": 20_000, "output_micros_per_m": 0},
    "default": {"input_micros_per_m": 150_000, "output_micros_per_m": 600_000},
}


def estimate_token_cost_micros(model: str, input_tokens: int, output_tokens: int) -> int:
    """Calculate exact LLM API cost in integer micro-USD (1 USD = 1,000,000 micro-USD).

    Eliminates floating-point accumulation drift and arbitrary 1-cent clamps.
    Rates are calculated with pure integer arithmetic and half-up rounding.
    """
    if input_tokens <= 0 and output_tokens <= 0:
        return 0
    rates = MODEL_PRICING_MICROS.get(model, MODEL_PRICING_MICROS["default"])
    numerator = (input_tokens * rates["input_micros_per_m"]) + (output_tokens * rates["output_micros_per_m"])
    micros = (numerator + 500_000) // 1_000_000
    return max(1, micros) if numerator > 0 else 0


def estimate_token_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate estimated LLM API cost in USD based on input and output tokens."""
    micros = estimate_token_cost_micros(model, input_tokens, output_tokens)
    return round(micros / 1_000_000.0, 6)


async def get_platform_financial_metrics(db: AsyncSession) -> dict:
    """Calculate real SaaS metrics: MRR, ARR, ARPU, Total AI Cost, Gross Margin, and Churn."""
    now = datetime.now(timezone.utc)
    current_period = now.strftime("%Y-%m")

    # 1. Organizations Counts
    total_orgs = await db.scalar(select(func.count(Organization.id))) or 0
    active_subs_count = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "active")
    ) or 0
    trial_orgs_count = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "trialing")
    ) or 0
    cancelled_count = await db.scalar(
        select(func.count(Subscription.id)).where(Subscription.status == "cancelled")
    ) or 0

    # 2. Real MRR calculation from actual active subscriptions
    res = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.status == "active")
    )
    mrr_usd = 0.0
    plan_distribution = {"start": 0, "pro": 0, "ultra": 0}

    for sub, plan in res.all():
        if sub.billing_cycle == "yearly":
            mrr_usd += plan.price_yearly / 12.0
        else:
            mrr_usd += float(plan.price_monthly)

    # Populate comprehensive plan distribution across all existing subscriptions
    dist_res = await db.execute(
        select(Plan.code, func.count(Subscription.id))
        .join(Plan, Subscription.plan_id == Plan.id)
        .group_by(Plan.code)
    )
    for p_code, p_cnt in dist_res.all():
        if p_code:
            plan_distribution[p_code.lower()] = p_cnt or 0

    arr_usd = mrr_usd * 12.0
    arpu_usd = (mrr_usd / active_subs_count) if active_subs_count > 0 else 0.0
    churn_rate = (cancelled_count / total_orgs * 100.0) if total_orgs > 0 else 0.0

    # 3. AI Usage & Estimated Cost across all organizations this month
    ai_msgs_total = await db.scalar(
        select(func.sum(UsageRecord.used)).where(
            UsageRecord.metric == "ai_messages",
            UsageRecord.period == current_period,
        )
    ) or 0

    cost_micros_total = await db.scalar(
        select(func.sum(UsageRecord.used)).where(
            UsageRecord.metric == "estimated_ai_cost_micros",
            UsageRecord.period == current_period,
        )
    ) or 0

    cost_cents_total = await db.scalar(
        select(func.sum(UsageRecord.used)).where(
            UsageRecord.metric == "estimated_ai_cost_cents",
            UsageRecord.period == current_period,
        )
    ) or 0

    # Total AI cost in USD: prefer micro-USD precision, fallback to legacy cents
    if cost_micros_total > 0:
        total_ai_cost_usd = round(cost_micros_total / 1_000_000.0, 4)
    else:
        total_ai_cost_usd = round(cost_cents_total / 100.0, 4)

    # 4. Gross Margin %
    if mrr_usd > 0:
        gross_margin_percent = round(((mrr_usd - total_ai_cost_usd) / mrr_usd) * 100.0, 1)
    else:
        gross_margin_percent = 100.0 if total_ai_cost_usd == 0 else 0.0

    return {
        "mrr_usd": round(mrr_usd, 2),
        "arr_usd": round(arr_usd, 2),
        "arpu_usd": round(arpu_usd, 2),
        "total_organizations": total_orgs,
        "active_subscriptions": active_subs_count,
        "trial_organizations": trial_orgs_count,
        "churn_rate_percent": round(churn_rate, 1),
        "total_ai_messages_this_month": ai_msgs_total,
        "total_ai_cost_usd": total_ai_cost_usd,
        "gross_margin_percent": gross_margin_percent,
        "plan_distribution": plan_distribution,
    }


async def get_organization_profitability_list(db: AsyncSession, limit: int = 100) -> list[dict]:
    """Return organizations with individual revenue, estimated AI cost, and margin.

    Optimized: aggregates costs and conversations in 2 bulk queries to eliminate N+1 latency.
    """
    now = datetime.now(timezone.utc)
    current_period = now.strftime("%Y-%m")

    # 1. Bulk aggregate AI costs per organization for current month
    # Prefer exact micro-USD metrics, fallback to legacy cents
    micros_res = await db.execute(
        select(UsageRecord.organization_id, func.sum(UsageRecord.used))
        .where(
            UsageRecord.metric == "estimated_ai_cost_micros",
            UsageRecord.period == current_period,
        )
        .group_by(UsageRecord.organization_id)
    )
    cost_by_org_micros = {row[0]: (row[1] or 0) for row in micros_res.all() if row[0] is not None}

    cents_res = await db.execute(
        select(UsageRecord.organization_id, func.sum(UsageRecord.used))
        .where(
            UsageRecord.metric == "estimated_ai_cost_cents",
            UsageRecord.period == current_period,
        )
        .group_by(UsageRecord.organization_id)
    )
    cost_by_org_cents = {row[0]: (row[1] or 0) for row in cents_res.all() if row[0] is not None}

    # Combined dictionary of AI costs in USD
    all_org_ids_with_cost = set(cost_by_org_micros.keys()).union(cost_by_org_cents.keys())
    cost_by_org_usd = {}
    for oid in all_org_ids_with_cost:
        if oid in cost_by_org_micros and cost_by_org_micros[oid] > 0:
            cost_by_org_usd[oid] = round(cost_by_org_micros[oid] / 1_000_000.0, 4)
        else:
            cost_by_org_usd[oid] = round(cost_by_org_cents.get(oid, 0) / 100.0, 4)

    # 2. Bulk aggregate conversation counts per organization
    conv_res = await db.execute(
        select(Conversation.organization_id, func.count(Conversation.id))
        .group_by(Conversation.organization_id)
    )
    conv_by_org = {row[0]: (row[1] or 0) for row in conv_res.all() if row[0] is not None}

    # 3. Fetch organizations with subscription and plan in a single joined query
    res = await db.execute(
        select(Organization, Subscription, Plan)
        .outerjoin(Subscription, Organization.id == Subscription.organization_id)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .order_by(Organization.created_at.desc())
        .limit(limit)
    )

    items = []
    for org, sub, plan in res.all():
        monthly_rev = 0.0
        plan_code = "None"
        sub_status = "inactive"
        if sub and plan and sub.status == "active":
            plan_code = plan.code.upper()
            sub_status = sub.status
            monthly_rev = (plan.price_yearly / 12.0) if sub.billing_cycle == "yearly" else float(plan.price_monthly)
        elif sub:
            plan_code = plan.code.upper() if plan else "START"
            sub_status = sub.status

        # Org AI cost in USD from pre-aggregated dictionary (using micro-USD precision)
        ai_cost = cost_by_org_usd.get(org.id, 0.0)

        margin = round(((monthly_rev - ai_cost) / monthly_rev) * 100.0, 1) if monthly_rev > 0 else 0.0
        conv_count = conv_by_org.get(org.id, 0)

        items.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "category": org.category,
            "plan": plan_code,
            "subscription_status": sub_status,
            "monthly_revenue_usd": round(monthly_rev, 2),
            "monthly_ai_cost_usd": ai_cost,
            "gross_margin_percent": margin,
            "is_profitable": (monthly_rev >= ai_cost),
            "conversations_count": conv_count,
            "bot_configured": bool(org.telegram_bot_token),
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })
    return items


class CostService:
    @staticmethod
    def estimate_token_cost_micros(model: str, input_tokens: int, output_tokens: int) -> int:
        return estimate_token_cost_micros(model, input_tokens, output_tokens)

    @staticmethod
    def estimate_token_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
        return estimate_token_cost_usd(model, input_tokens, output_tokens)

    @staticmethod
    async def get_platform_financial_metrics(db: AsyncSession) -> dict:
        return await get_platform_financial_metrics(db)

    @staticmethod
    async def get_organization_profitability_list(db: AsyncSession, limit: int = 100) -> list[dict]:
        return await get_organization_profitability_list(db, limit=limit)

    @staticmethod
    async def track_ai_call_cost(db: AsyncSession, organization_id: int, model: str, input_tokens: int, output_tokens: int):
        from app.services.usage_service import usage_service
        # Precise integer micro-USD accounting (1 USD = 1,000,000 micros)
        cost_micros = estimate_token_cost_micros(model, input_tokens, output_tokens)
        await usage_service.increment_usage(db, organization_id, "estimated_ai_cost_micros", cost_micros)

        # Backward compatibility with legacy cents metric without artificial 1-cent minimum clamp
        legacy_cents = cost_micros // 10_000
        if legacy_cents > 0:
            await usage_service.increment_usage(db, organization_id, "estimated_ai_cost_cents", legacy_cents)


cost_service = CostService()

