"""Centralized Feature Entitlement and Plan Limits System."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Organization, Plan, Subscription


# All standard SaaS feature keys and their descriptions
FEATURE_DEFINITIONS = {
    "ai_auto_reply": {
        "name": "AI Avtomatik Javob",
        "description": "Telegram orqali kelgan xabarlarga sun'iy intellekt tomonidan mustaqil javob berish.",
        "min_plan": "start",
    },
    "human_takeover": {
        "name": "Operator Nazorati (Takeover)",
        "description": "Istalgan vaqtda suhbatni operator qo'liga olish va AI ni to'xtatib turish.",
        "min_plan": "start",
    },
    "live_inbox": {
        "name": "Jonli Suhbatlar Paneli",
        "description": "Barcha mijozlar bilan jonli xabarlashuv interfeysi.",
        "min_plan": "start",
    },
    "knowledge_base": {
        "name": "Telegram Mahsulotlar Bazasi",
        "description": "Kanaldagi postlar va tavsiflarni AI xotirasiga kiritish.",
        "min_plan": "start",
    },
    "custom_ai_personality": {
        "name": "Maxsus AI Shaxsi",
        "description": "Bot ohangi, tili va javob berish uslubini sozlash.",
        "min_plan": "start",
    },
    "team_management": {
        "name": "Jamoa A'zolari Boshqaruvi",
        "description": "Xodimlarni turli rollar (Manager, Operator, Viewer) bilan taklif qilish.",
        "min_plan": "start",
    },
    "automation": {
        "name": "Avtomatlashtirish Qoidalari",
        "description": "Ish vaqti, takroriy xabarlar va avto-buyurtma olish qoidalari.",
        "min_plan": "start",
    },
    "ai_image_understanding": {
        "name": "Rasmli Xabarlarni Tushunish",
        "description": "Mijozlar yuborgan skrinshotlar va mahsulot rasmlarini AI orqali tahlil qilish.",
        "min_plan": "pro",
    },
    "advanced_rag": {
        "name": "Kengaytirilgan Vektor Qidiruv (RAG)",
        "description": "Ko'p minglab mahsulotlar orasidan o'xshashlik bo'yicha eng aniq kontekstni tanlash.",
        "min_plan": "pro",
    },
    "multiple_channels": {
        "name": "Ko'p Kanalli Integratsiya",
        "description": "Bitta hisobga bir nechta Telegram kanallarini ulash.",
        "min_plan": "pro",
    },
    "knowledge_sync": {
        "name": "Avtomatik Kanal Sinxronizatsiyasi",
        "description": "Yangi postlar chiqqanda AI bilim bazasini avtomatik yangilash.",
        "min_plan": "pro",
    },
    "advanced_analytics": {
        "name": "Kengaytirilgan Savdo Tahlili",
        "description": "Konversiya, o'rtacha chek va mijozlar faolligi bo'yicha chuqur grafiklar.",
        "min_plan": "pro",
    },
    "api_access": {
        "name": "Dasturlash Interfeysi (API)",
        "description": "Tashqi CRM yoki ERP tizimlarini ulash uchun REST API kalitlari.",
        "min_plan": "pro",
    },
    "webhooks": {
        "name": "Chiquvchi Webhooklar",
        "description": "Yangi buyurtma yoki chat holati o'zgarganda tashqi tizimga avto-bildirishnoma.",
        "min_plan": "pro",
    },
    "data_export": {
        "name": "Ma'lumotlarni Eksport Qilish",
        "description": "Buyurtmalar, mijozlar va yozishmalar tarixini CSV/Excel formatida yuklab olish.",
        "min_plan": "pro",
    },
    "audit_logs": {
        "name": "Xavfsizlik Amallari Tarixi",
        "description": "Xodimlar tomonidan amalga oshirilgan har bir o'zgarishni qayd etish.",
        "min_plan": "pro",
    },
    "priority_support": {
        "name": "Ustuvor Texnik Yordam",
        "description": "24/7 tezkor xizmat va texnik mutaxassis ko'magi.",
        "min_plan": "pro",
    },
    "custom_ai_tools": {
        "name": "Maxsus AI Funksiyalari (Tools)",
        "description": "AI mijoz uchun bevosita omborni tekshirish yoki buyurtma hisoblash imkoniyati.",
        "min_plan": "ultra",
    },
    "bulk_operations": {
        "name": "Ommaviy Amallar",
        "description": "Yuzlab mahsulotlar va buyurtmalarni bir vaqtda boshqarish.",
        "min_plan": "ultra",
    },
    "dedicated_config": {
        "name": "Maxsus Server va Ajratilgan Resurslar",
        "description": "Yuqori yuklamalarga mo'ljallangan alohida AI quvvati va parametrlar.",
        "min_plan": "ultra",
    },
}


class FeatureNotAvailableException(HTTPException):
    def __init__(self, feature_key: str, required_plan: str = "pro", current_plan: str = "start"):
        detail = {
            "error": "FEATURE_NOT_AVAILABLE",
            "feature": feature_key,
            "feature_name": FEATURE_DEFINITIONS.get(feature_key, {}).get("name", feature_key),
            "required_plan": required_plan.upper(),
            "current_plan": current_plan.upper(),
            "message": f"'{FEATURE_DEFINITIONS.get(feature_key, {}).get('name', feature_key)}' funksiyasi faqat {required_plan.upper()} tarifida mavjud.",
        }
        super().__init__(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=detail)


async def get_organization_plan_and_subscription(
    db: AsyncSession, organization_id: int
) -> tuple[Organization | None, Plan | None, Subscription | None]:
    """Retrieve organization, active plan, and subscription."""
    org = await db.get(Organization, organization_id)
    if not org:
        return None, None, None

    res = await db.execute(
        select(Subscription, Plan)
        .join(Plan, Subscription.plan_id == Plan.id)
        .where(Subscription.organization_id == organization_id)
    )
    row = res.first()
    if row:
        sub, plan = row
        return org, plan, sub

    # Fallback to START plan if no subscription record yet
    plan_res = await db.execute(select(Plan).where(Plan.code == "start"))
    start_plan = plan_res.scalar_one_or_none()
    return org, start_plan, None


async def has_feature(db: AsyncSession, organization_id: int, feature_key: str) -> bool:
    """Check if the organization has access to a specific feature key."""
    _org, plan, sub = await get_organization_plan_and_subscription(db, organization_id)
    if not plan:
        return False

    # Check subscription status: if expired, block premium features
    if sub and sub.status in ("expired", "cancelled", "paused"):
        # Expired subscriptions only get basic access
        if feature_key in ("live_inbox", "knowledge_base"):
            return True
        return False

    features = plan.features or {}
    val = features.get(feature_key)
    if isinstance(val, bool):
        return val
    if isinstance(val, str) and val.lower() in ("yes", "true", "limited", "unlimited"):
        return True
    return bool(val)


async def require_feature(db: AsyncSession, organization_id: int, feature_key: str) -> bool:
    """Enforce feature entitlement. Raises FeatureNotAvailableException if missing."""
    allowed = await has_feature(db, organization_id, feature_key)
    if not allowed:
        _org, plan, _sub = await get_organization_plan_and_subscription(db, organization_id)
        current_code = plan.code if plan else "start"
        required_code = FEATURE_DEFINITIONS.get(feature_key, {}).get("min_plan", "pro")
        raise FeatureNotAvailableException(
            feature_key=feature_key,
            required_plan=required_code,
            current_plan=current_code,
        )
    return True


async def get_all_entitlements(db: AsyncSession, organization_id: int) -> dict:
    """Return dictionary of all features and whether they are enabled for the org."""
    _org, plan, sub = await get_organization_plan_and_subscription(db, organization_id)
    plan_code = plan.code if plan else "start"
    features_map = plan.features if plan else {}
    sub_status = sub.status if sub else "trialing"

    entitlements = {}
    for key, info in FEATURE_DEFINITIONS.items():
        enabled = bool(features_map.get(key, False))
        if sub and sub.status in ("expired", "cancelled"):
            if key not in ("live_inbox", "knowledge_base"):
                enabled = False

        entitlements[key] = {
            "key": key,
            "name": info["name"],
            "description": info["description"],
            "min_plan": info["min_plan"],
            "enabled": enabled,
            "value": features_map.get(key),
        }

    return {
        "organization_id": organization_id,
        "plan_code": plan_code,
        "plan_name": plan.name if plan else "START",
        "subscription_status": sub_status,
        "entitlements": entitlements,
    }


class EntitlementService:
    @staticmethod
    async def has_feature(db: AsyncSession, organization_id: int, feature_key: str) -> bool:
        return await has_feature(db, organization_id, feature_key)

    @staticmethod
    async def require_feature(db: AsyncSession, organization_id: int, feature_key: str) -> bool:
        return await require_feature(db, organization_id, feature_key)

    @staticmethod
    async def get_all_entitlements(db: AsyncSession, organization_id: int) -> dict:
        return await get_all_entitlements(db, organization_id)

    @staticmethod
    async def get_organization_plan_and_subscription(db: AsyncSession, organization_id: int):
        return await get_organization_plan_and_subscription(db, organization_id)


entitlement_service = EntitlementService()

