"""AI Cost Tracking, Financial Metrics (MRR, ARR, ARPU) and Margin Analysis."""

from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Organization, Plan, Subscription, UsageRecord


# Pricing per 1,000,000 tokens in USD
MODEL_PRICING = {
    "gemini-3.1-flash-lite": {"input_per_m": 0.075, "output_per_m": 0.30},
    "gemini-3.5-flash": {"input_per_m": 0.15, "output_per_m": 0.60},
    "gemini-3.8-flash": {"input_per_m": 1.25, "output_per_m": 5.00},
    "gemini-embedding-001": {"input_per_m": 0.02, "output_per_m": 0.0},
    "default": {"input_per_m": 0.15, "output_per_m": 0.60},
}


def estimate_token_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate estimated LLM API cost in USD based on input and output tokens."""
    rates = MODEL_PRICING.get(model, MODEL_PRICING["default"])
    input_cost = (input_tokens / 1_000_000.0) * rates["input_per_m"]
    output_cost = (output_tokens / 1_000_000.0) * rates["output_per_m"]
    return round(input_cost + output_cost, 6)


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
        plan_code = plan.code.lower()
        plan_distribution[plan_code] = plan_distribution.get(plan_code, 0) + 1
        if sub.billing_cycle == "yearly":
            mrr_usd += plan.price_yearly / 12.0
        else:
            mrr_usd += float(plan.price_monthly)

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

    cost_cents_total = await db.scalar(
        select(func.sum(UsageRecord.used)).where(
            UsageRecord.metric == "estimated_ai_cost_cents",
            UsageRecord.period == current_period,
        )
    ) or 0
    total_ai_cost_usd = round(cost_cents_total / 100.0, 2)

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


async def get_organization_profitability_list(db: AsyncSession) -> list[dict]:
    """Return organizations with individual revenue, estimated AI cost, and margin."""
    now = datetime.now(timezone.utc)
    current_period = now.strftime("%Y-%m")

    res = await db.execute(
        select(Organization, Subscription, Plan)
        .outerjoin(Subscription, Organization.id == Subscription.organization_id)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .order_by(Organization.created_at.desc())
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

        # Org AI cost this month
        cost_cents = await db.scalar(
            select(UsageRecord.used).where(
                UsageRecord.organization_id == org.id,
                UsageRecord.metric == "estimated_ai_cost_cents",
                UsageRecord.period == current_period,
            )
        ) or 0
        ai_cost = round(cost_cents / 100.0, 3)

        margin = round(((monthly_rev - ai_cost) / monthly_rev) * 100.0, 1) if monthly_rev > 0 else 0.0

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
        })
    return items


class CostService:
    @staticmethod
    def estimate_token_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
        return estimate_token_cost_usd(model, input_tokens, output_tokens)

    @staticmethod
    async def get_platform_financial_metrics(db: AsyncSession) -> dict:
        return await get_platform_financial_metrics(db)

    @staticmethod
    async def get_organization_profitability_list(db: AsyncSession) -> list[dict]:
        return await get_organization_profitability_list(db)

    @staticmethod
    async def track_ai_call_cost(db: AsyncSession, organization_id: int, model: str, input_tokens: int, output_tokens: int):
        from app.services.usage_service import usage_service
        cost_usd = estimate_token_cost_usd(model, input_tokens, output_tokens)
        cost_cents = max(1, int(cost_usd * 100))
        await usage_service.increment_usage(db, organization_id, "estimated_ai_cost_cents", cost_cents)


cost_service = CostService()

