"""Admin permission constants and default role templates."""

# All available granular permissions.
ALL_PERMISSIONS = [
    "can_view_conversations",
    "can_reply_customers",
    "can_takeover",
    "can_resume_ai",
    "can_view_knowledge",
    "can_manage_knowledge",
    "can_manage_admins",
    "can_view_orders",
    "can_manage_orders",
    "can_view_analytics",
]

# Default permission sets per role.
ROLE_DEFAULTS: dict[str, dict[str, bool]] = {
    "owner": {perm: True for perm in ALL_PERMISSIONS},
    "admin": {
        "can_view_conversations": True,
        "can_reply_customers": True,
        "can_takeover": True,
        "can_resume_ai": True,
        "can_view_knowledge": True,
        "can_manage_knowledge": True,
        "can_manage_admins": False,
        "can_view_orders": True,
        "can_manage_orders": True,
        "can_view_analytics": True,
    },
    "moderator": {
        "can_view_conversations": True,
        "can_reply_customers": True,
        "can_takeover": True,
        "can_resume_ai": True,
        "can_view_knowledge": True,
        "can_manage_knowledge": False,
        "can_manage_admins": False,
        "can_view_orders": True,
        "can_manage_orders": False,
        "can_view_analytics": False,
    },
}

VALID_ROLES = list(ROLE_DEFAULTS.keys())

# Human-readable permission labels (Uzbek).
PERMISSION_LABELS: dict[str, str] = {
    "can_view_conversations": "💬 Suhbatlarni ko'rish",
    "can_reply_customers": "✍️ Mijozlarga javob berish",
    "can_takeover": "🤝 Suhbatni qabul qilish",
    "can_resume_ai": "🤖 AI ni qayta yoqish",
    "can_view_knowledge": "📚 Bilim bazasini ko'rish",
    "can_manage_knowledge": "📝 Bilim bazasini boshqarish",
    "can_manage_admins": "👥 Adminlarni boshqarish",
    "can_view_orders": "📦 Buyurtmalarni ko'rish",
    "can_manage_orders": "🛒 Buyurtmalarni boshqarish",
    "can_view_analytics": "📊 Statistikani ko'rish",
}
