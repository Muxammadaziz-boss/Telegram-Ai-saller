"""SaaS Tenant, Plan, Subscription, and Organization Management Service."""

from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import ROLE_DEFAULTS
from app.models import (
    Admin,
    AIModelConfiguration,
    BusinessConnection,
    ChannelPost,
    ConnectedChannel,
    Conversation,
    Customer,
    Message,
    Order,
    Organization,
    OrganizationMember,
    Plan,
    Product,
    Subscription,
    SystemSetting,
    User,
)

logger = get_logger(__name__)


# Default Plan Specifications
DEFAULT_PLANS = [
    {
        "code": "start",
        "name": "START",
        "description": "Kichik biznes va yakka tartibdagi tadbirkorlar uchun boshlang'ich avtomatlashtirish.",
        "price_monthly": 19,
        "price_yearly": 190,
        "currency": "USD",
        "is_featured": False,
        "features": {
            "ai_auto_reply": True,
            "human_takeover": True,
            "live_inbox": True,
            "knowledge_base": True,
            "custom_ai_personality": True,
            "team_management": True,
            "automation": True,
            "ai_image_understanding": "limited",
            "advanced_rag": False,
            "multiple_channels": False,
            "knowledge_sync": False,
            "advanced_analytics": False,
            "api_access": False,
            "webhooks": False,
            "custom_ai_tools": False,
            "data_export": False,
            "audit_logs": False,
            "bulk_operations": False,
            "priority_support": False,
            "dedicated_config": False,
        },
        "limits": {
            "ai_messages": 1000,
            "ai_conversations": 500,
            "telegram_connections": 1,
            "telegram_channels": 1,
            "knowledge_posts": 500,
            "products": 100,
            "customers": 1000,
            "monthly_orders": 500,
            "team_members": 2,
            "history_retention_days": 30,
        },
        "ai_model": {
            "provider": "gemini",
            "model": "gemini-3.1-flash-lite",
            "max_tokens": 1500,
            "temperature": 0.2,
            "vision_enabled": True,
        },
    },
    {
        "code": "pro",
        "name": "PRO",
        "description": "Eng ommabop tarif: ko'p kanalli sotuvlar, to'liq bilimlar bazasi va kengaytirilgan RAG.",
        "price_monthly": 59,
        "price_yearly": 590,
        "currency": "USD",
        "is_featured": True,  # MOST POPULAR
        "features": {
            "ai_auto_reply": True,
            "human_takeover": True,
            "live_inbox": True,
            "knowledge_base": True,
            "custom_ai_personality": True,
            "team_management": True,
            "automation": True,
            "ai_image_understanding": True,
            "advanced_rag": True,
            "multiple_channels": True,
            "knowledge_sync": True,
            "advanced_analytics": True,
            "api_access": True,
            "webhooks": True,
            "custom_ai_tools": False,
            "data_export": True,
            "audit_logs": True,
            "bulk_operations": False,
            "priority_support": True,
            "dedicated_config": False,
        },
        "limits": {
            "ai_messages": 7500,
            "ai_conversations": 2500,
            "telegram_connections": 3,
            "telegram_channels": 5,
            "knowledge_posts": 5000,
            "products": 1000,
            "customers": 10000,
            "monthly_orders": 5000,
            "team_members": 10,
            "history_retention_days": 365,
        },
        "ai_model": {
            "provider": "gemini",
            "model": "gemini-3.5-flash",
            "max_tokens": 2048,
            "temperature": 0.2,
            "vision_enabled": True,
        },
    },
    {
        "code": "ultra",
        "name": "ULTRA",
        "description": "Katta kompaniyalar va agentliklar uchun: cheksiz quvvat, maxsus integratsiyalar va ustuvorlik.",
        "price_monthly": 149,
        "price_yearly": 1490,
        "currency": "USD",
        "is_featured": False,
        "features": {
            "ai_auto_reply": True,
            "human_takeover": True,
            "live_inbox": True,
            "knowledge_base": True,
            "custom_ai_personality": True,
            "team_management": True,
            "automation": True,
            "ai_image_understanding": True,
            "advanced_rag": True,
            "multiple_channels": True,
            "knowledge_sync": True,
            "advanced_analytics": True,
            "api_access": True,
            "webhooks": True,
            "custom_ai_tools": True,
            "data_export": True,
            "audit_logs": True,
            "bulk_operations": True,
            "priority_support": True,
            "dedicated_config": True,
        },
        "limits": {
            "ai_messages": 30000,
            "ai_conversations": 10000,
            "telegram_connections": 10,
            "telegram_channels": 20,
            "knowledge_posts": 50000,
            "products": 10000,
            "customers": 100000,
            "monthly_orders": 50000,
            "team_members": 50,
            "history_retention_days": 730,
        },
        "ai_model": {
            "provider": "gemini",
            "model": "gemini-3.8-flash",
            "max_tokens": 4096,
            "temperature": 0.2,
            "vision_enabled": True,
        },
    },
]


async def seed_plans_and_defaults(db: AsyncSession):
    """Seed commercial plans, AI model routing configs, and ensure default organization."""
    # 1. Seed or update Plans
    plan_records = {}
    for plan_spec in DEFAULT_PLANS:
        res = await db.execute(select(Plan).where(Plan.code == plan_spec["code"]))
        plan = res.scalar_one_or_none()
        if not plan:
            plan = Plan(
                code=plan_spec["code"],
                name=plan_spec["name"],
                description=plan_spec["description"],
                price_monthly=plan_spec["price_monthly"],
                price_yearly=plan_spec["price_yearly"],
                currency=plan_spec["currency"],
                features=plan_spec["features"],
                limits=plan_spec["limits"],
                is_active=True,
                is_featured=plan_spec["is_featured"],
            )
            db.add(plan)
            await db.flush()
            logger.info("Plan seeded: %s", plan.name)
        else:
            # Update limits or features if altered
            plan.features = plan_spec["features"]
            plan.limits = plan_spec["limits"]
            plan.price_monthly = plan_spec["price_monthly"]
            plan.price_yearly = plan_spec["price_yearly"]
            plan.is_featured = plan_spec["is_featured"]
        plan_records[plan.code] = plan

        # Seed AI Model Configuration for plan
        cfg_res = await db.execute(
            select(AIModelConfiguration).where(AIModelConfiguration.plan_id == plan.id)
        )
        model_cfg = cfg_res.scalar_one_or_none()
        ai_spec = plan_spec["ai_model"]
        if not model_cfg:
            model_cfg = AIModelConfiguration(
                plan_id=plan.id,
                provider=ai_spec["provider"],
                model=ai_spec["model"],
                max_tokens=ai_spec["max_tokens"],
                temperature=ai_spec["temperature"],
                vision_enabled=ai_spec["vision_enabled"],
            )
            db.add(model_cfg)
        else:
            model_cfg.model = ai_spec["model"]

    # 2. Seed Default Organization (Backward Compatibility)
    org_res = await db.execute(select(Organization).where(Organization.id == 1))
    default_org = org_res.scalar_one_or_none()
    if not default_org:
        default_org = Organization(
            id=1,
            name="AI Sales Central",
            slug="ai-sales-central",
            category="Computers & Electronics",
            status="active",
            retention_days=365,
            ai_language="uz",
            ai_personality="Professional va do'stona sotuvchi assistent",
        )
        db.add(default_org)
        await db.flush()
        logger.info("Default Organization created: ID=1 (%s)", default_org.name)

    # 3. Seed Owner User
    owner_tg_id = settings.admin_telegram_id if settings.admin_telegram_id else None
    owner_user = None
    if owner_tg_id:
        user_res = await db.execute(select(User).where(User.telegram_user_id == owner_tg_id))
        owner_user = user_res.scalar_one_or_none()
    if not owner_user:
        # Check by email
        email_res = await db.execute(select(User).where(User.email == "admin@aisales.uz"))
        owner_user = email_res.scalar_one_or_none()
        if not owner_user:
            owner_user = User(
                email="admin@aisales.uz",
                full_name="Muxammadaziz",
                telegram_user_id=owner_tg_id,
                is_platform_owner=True,
                is_active=True,
            )
            db.add(owner_user)
            await db.flush()
            logger.info("Owner User created: %s (tg_id=%s)", owner_user.email, owner_tg_id)

    # 4. Bind Owner to Default Organization as Owner
    member_res = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == default_org.id,
            OrganizationMember.user_id == owner_user.id,
        )
    )
    if not member_res.scalar_one_or_none():
        membership = OrganizationMember(
            organization_id=default_org.id,
            user_id=owner_user.id,
            role="owner",
            permissions=ROLE_DEFAULTS["owner"],
            is_active=True,
        )
        db.add(membership)

    # 5. Ensure Subscription for Default Org (Active PRO plan)
    sub_res = await db.execute(
        select(Subscription).where(Subscription.organization_id == default_org.id)
    )
    sub = sub_res.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    pro_plan = plan_records.get("pro") or plan_records["start"]
    if not sub:
        sub = Subscription(
            organization_id=default_org.id,
            plan_id=pro_plan.id,
            status="active",
            billing_cycle="yearly",
            provider="mock",
            started_at=now,
            current_period_start=now,
            current_period_end=now + timedelta(days=365),
            trial_ends_at=now + timedelta(days=14),
        )
        db.add(sub)
        logger.info("Active PRO subscription bound to default organization.")

    # 6. Backward Compatibility: attach legacy records with null organization_id
    await db.execute(
        update(Conversation).where(Conversation.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(Message).where(Message.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(ChannelPost).where(ChannelPost.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(ConnectedChannel).where(ConnectedChannel.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(Order).where(Order.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(BusinessConnection).where(BusinessConnection.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(SystemSetting).where(SystemSetting.organization_id.is_(None)).values(organization_id=default_org.id)
    )
    await db.execute(
        update(Admin).where(Admin.organization_id.is_(None)).values(organization_id=default_org.id)
    )

    # 7. Seed Default Catalog Products if empty
    prod_count = await db.scalar(select(func.count(Product.id)).where(Product.organization_id == default_org.id))
    if prod_count == 0:
        default_catalog = [
            {"code": "LAP-01", "name": "Asus TUF Gaming FX505GE", "category": "Gaming", "specs": "i7-8750H / 16GB RAM / 512GB SSD / GTX1050ti 4GB", "price": "$340", "stock": "In Stock", "warranty": "2 oy kafolat"},
            {"code": "LAP-02", "name": "Lenovo ThinkPad E14 Gen 4", "category": "Business", "specs": "Ryzen 5 5625U / 16GB RAM / 512GB NVMe / 14' IPS FHD", "price": "$430", "stock": "In Stock", "warranty": "3 oy kafolat"},
            {"code": "LAP-03", "name": "HP Victus 15-fb0028nr", "category": "Gaming", "specs": "Ryzen 5 5600H / 16GB RAM / 512GB SSD / GTX1650 4GB", "price": "$490", "stock": "In Stock", "warranty": "2 oy kafolat"},
            {"code": "LAP-04", "name": "Dell Latitude 5420 Business", "category": "Ultrabook", "specs": "i5-1145G7 / 16GB RAM / 256GB SSD / Iris Xe", "price": "$320", "stock": "Low Stock", "warranty": "1 oy kafolat"},
            {"code": "LAP-05", "name": "Apple MacBook Air M1 (2020)", "category": "Premium", "specs": "Apple M1 8-Core / 8GB Unified / 256GB SSD / Space Gray", "price": "$610", "stock": "In Stock", "warranty": "3 oy kafolat"},
            {"code": "LAP-06", "name": "Acer Nitro 5 AN515-57", "category": "Gaming", "specs": "i5-11400H / 16GB RAM / 512GB SSD / RTX3050 4GB", "price": "$560", "stock": "In Stock", "warranty": "2 oy kafolat"},
        ]
        for item in default_catalog:
            db.add(Product(organization_id=default_org.id, **item))
        logger.info("Default laptop catalog seeded into products table.")

    await db.commit()


async def create_organization_with_trial(
    db: AsyncSession,
    user: User,
    name: str,
    slug: str,
    category: str = "Retail",
    plan_code: str = "start",
    trial_days: int = 7,
) -> Organization:
    """Create a new organization for an onboarding user with 7-day free trial."""
    # Ensure slug uniqueness
    base_slug = slug or name.lower().replace(" ", "-")
    clean_slug = "".join(c for c in base_slug if c.isalnum() or c in ("-", "_")).strip("-")
    if not clean_slug:
        clean_slug = f"org-{int(datetime.now().timestamp())}"

    existing = await db.execute(select(Organization).where(Organization.slug == clean_slug))
    if existing.scalar_one_or_none():
        clean_slug = f"{clean_slug}-{int(datetime.now().timestamp() % 10000)}"

    org = Organization(
        name=name.strip(),
        slug=clean_slug,
        category=category,
        status="active",
        retention_days=90,
    )
    db.add(org)
    await db.flush()

    # Add user as OWNER
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role="owner",
        permissions=ROLE_DEFAULTS["owner"],
        is_active=True,
    )
    db.add(member)

    # Fetch selected plan (default START)
    res = await db.execute(select(Plan).where(Plan.code == plan_code))
    plan = res.scalar_one_or_none()
    if not plan:
        res = await db.execute(select(Plan).where(Plan.code == "start"))
        plan = res.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    trial_end = now + timedelta(days=trial_days)

    subscription = Subscription(
        organization_id=org.id,
        plan_id=plan.id,
        status="trialing",
        billing_cycle="monthly",
        provider="mock",
        started_at=now,
        current_period_start=now,
        current_period_end=trial_end,
        trial_ends_at=trial_end,
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(org)
    return org


async def get_user_organizations(db: AsyncSession, user_id: int) -> list[dict]:
    """Retrieve all organizations a user belongs to with role and subscription info."""
    res = await db.execute(
        select(Organization, OrganizationMember, Subscription, Plan)
        .join(OrganizationMember, Organization.id == OrganizationMember.organization_id)
        .outerjoin(Subscription, Organization.id == Subscription.organization_id)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .where(OrganizationMember.user_id == user_id, OrganizationMember.is_active.is_(True))
    )
    results = []
    for org, member, sub, plan in res.all():
        results.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "category": org.category,
            "role": member.role,
            "status": org.status,
            "subscription": {
                "status": sub.status if sub else "trialing",
                "plan_code": plan.code if plan else "start",
                "plan_name": plan.name if plan else "START",
                "trial_ends_at": sub.trial_ends_at.isoformat() if sub and sub.trial_ends_at else None,
                "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            } if sub else None,
        })
    return results


async def get_organization_details(db: AsyncSession, organization_id: int) -> dict | None:
    """Retrieve full organization details including settings and active plan."""
    org = await db.get(Organization, organization_id)
    if not org:
        return None

    sub_res = await db.execute(
        select(Subscription, Plan)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.organization_id == organization_id)
    )
    row = sub_res.first()
    sub, plan = row if row else (None, None)

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "category": org.category,
        "status": org.status,
        "ai_language": org.ai_language,
        "ai_personality": org.ai_personality,
        "retention_days": org.retention_days,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "subscription": {
            "status": sub.status if sub else "inactive",
            "plan_code": plan.code if plan else "start",
            "plan_name": plan.name if plan else "START",
            "billing_cycle": sub.billing_cycle if sub else "monthly",
            "trial_ends_at": sub.trial_ends_at.isoformat() if sub and sub.trial_ends_at else None,
            "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end if sub else False,
        } if sub else None,
    }


async def get_organization_subscription(db: AsyncSession, organization_id: int) -> dict | None:
    """Retrieve active subscription information, plan limits, and trial countdown."""
    sub_res = await db.execute(
        select(Subscription, Plan)
        .outerjoin(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.organization_id == organization_id)
    )
    row = sub_res.first()
    if not row:
        return None
    sub, plan = row

    now = datetime.now(timezone.utc)
    trial_days_left = 0
    if sub.trial_ends_at and sub.trial_ends_at > now:
        trial_days_left = max(0, (sub.trial_ends_at - now).days + 1)

    return {
        "id": sub.id,
        "organization_id": sub.organization_id,
        "status": sub.status,
        "billing_cycle": sub.billing_cycle,
        "provider": sub.provider,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "trial_days_remaining": trial_days_left,
        "is_trial": (sub.status == "trialing"),
        "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "plan": {
            "code": plan.code if plan else "start",
            "name": plan.name if plan else "START",
            "price_monthly": plan.price_monthly if plan else 19,
            "price_yearly": plan.price_yearly if plan else 190,
            "features": plan.features if plan else {},
            "limits": plan.limits if plan else {},
        } if plan else None,
    }


# Re-export lifecycle management functions from billing_service
from app.services.billing_service import (
    cancel_organization_subscription,
    resume_organization_subscription,
    upgrade_organization_plan,
)

