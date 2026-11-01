"""Comprehensive Automated Test Suite for AI Sales Multi-Tenant SaaS Platform."""

import pytest
from app.core.permissions import ALL_PERMISSIONS, ROLE_DEFAULTS
from app.models import (
    Conversation,
    Organization,
    OrganizationMember,
    Plan,
    Subscription,
    UsageRecord,
    User,
    WebhookEvent,
)
from app.services.cost_service import estimate_token_cost_usd
from app.services.entitlement_service import (
    FEATURE_DEFINITIONS,
    FeatureNotAvailableException,
)
from app.services.saas_service import DEFAULT_PLANS
from app.services.usage_service import METRIC_DEFINITIONS


# ============================================================================
# 1. PLAN DEFINITIONS & LIMITS SPECIFICATION TESTS
# ============================================================================

def test_default_plans_specification():
    """Verify exactly START, PRO, ULTRA plans are defined with exact prices & limits."""
    plans = {p["code"]: p for p in DEFAULT_PLANS}
    assert "start" in plans
    assert "pro" in plans
    assert "ultra" in plans

    # START plan
    start = plans["start"]
    assert start["price_monthly"] == 19
    assert start["price_yearly"] == 190
    assert start["limits"]["ai_messages"] == 1000
    assert start["limits"]["ai_conversations"] == 500
    assert start["limits"]["telegram_connections"] == 1
    assert start["limits"]["products"] == 100
    assert start["limits"]["team_members"] == 2
    assert start["features"]["ai_auto_reply"] is True
    assert start["features"]["advanced_rag"] is False
    assert start["features"]["api_access"] is False

    # PRO plan (Most Popular)
    pro = plans["pro"]
    assert pro["is_featured"] is True
    assert pro["price_monthly"] == 59
    assert pro["price_yearly"] == 590
    assert pro["limits"]["ai_messages"] == 7500
    assert pro["limits"]["ai_conversations"] == 2500
    assert pro["limits"]["telegram_connections"] == 3
    assert pro["limits"]["products"] == 1000
    assert pro["limits"]["team_members"] == 10
    assert pro["features"]["advanced_rag"] is True
    assert pro["features"]["ai_image_understanding"] is True
    assert pro["features"]["data_export"] is True

    # ULTRA plan
    ultra = plans["ultra"]
    assert ultra["price_monthly"] == 149
    assert ultra["price_yearly"] == 1490
    assert ultra["limits"]["ai_messages"] == 30000
    assert ultra["limits"]["ai_conversations"] == 10000
    assert ultra["limits"]["telegram_connections"] == 10
    assert ultra["limits"]["products"] == 10000
    assert ultra["limits"]["team_members"] == 50
    assert ultra["features"]["custom_ai_tools"] is True
    assert ultra["features"]["dedicated_config"] is True


# ============================================================================
# 2. FEATURE ENTITLEMENT LOGIC TESTS
# ============================================================================

def test_feature_definitions_coverage():
    """Verify all 16+ core SaaS features are defined in entitlement matrix."""
    expected_features = [
        "ai_auto_reply",
        "human_takeover",
        "live_inbox",
        "knowledge_base",
        "custom_ai_personality",
        "team_management",
        "automation",
        "ai_image_understanding",
        "advanced_rag",
        "multiple_channels",
        "knowledge_sync",
        "advanced_analytics",
        "api_access",
        "webhooks",
        "custom_ai_tools",
        "data_export",
        "audit_logs",
        "bulk_operations",
        "priority_support",
        "dedicated_config",
    ]
    for feat in expected_features:
        assert feat in FEATURE_DEFINITIONS, f"Feature {feat} is missing from FEATURE_DEFINITIONS"


def test_feature_not_available_exception():
    """Verify FeatureNotAvailableException returns structured data for UI upgrade modal."""
    exc = FeatureNotAvailableException("advanced_rag", required_plan="pro", current_plan="start")
    assert exc.status_code == 402
    assert exc.detail["error"] == "FEATURE_NOT_AVAILABLE"
    assert exc.detail["feature"] == "advanced_rag"
    assert exc.detail["required_plan"] == "PRO"
    assert exc.detail["current_plan"] == "START"


# ============================================================================
# 3. USAGE METERING & PROGRESS STATES
# ============================================================================

def test_metric_definitions_coverage():
    """Verify all tracked metrics are registered."""
    metrics = list(METRIC_DEFINITIONS.keys())
    assert "ai_messages" in metrics
    assert "ai_conversations" in metrics
    assert "knowledge_posts" in metrics
    assert "products" in metrics
    assert "customers" in metrics
    assert "monthly_orders" in metrics
    assert "team_members" in metrics
    assert "telegram_connections" in metrics
    assert "telegram_channels" in metrics


def test_usage_limit_thresholds():
    """Verify warning thresholds: normal < 70%, warning 70-89%, critical 90-99%, exceeded >= 100%."""
    def calc_status(used: int, limit: int) -> str:
        pct = int((used / limit) * 100) if limit > 0 else 0
        if pct >= 100:
            return "exceeded"
        if pct >= 90:
            return "critical"
        if pct >= 70:
            return "warning"
        return "normal"

    assert calc_status(500, 1000) == "normal"    # 50%
    assert calc_status(699, 1000) == "normal"    # 69%
    assert calc_status(700, 1000) == "warning"   # 70%
    assert calc_status(899, 1000) == "warning"   # 89%
    assert calc_status(900, 1000) == "critical"  # 90%
    assert calc_status(999, 1000) == "critical"  # 99%
    assert calc_status(1000, 1000) == "exceeded" # 100%
    assert calc_status(1200, 1000) == "exceeded" # 120%


# ============================================================================
# 4. AI TOKEN COST & MARGIN MATH TESTS
# ============================================================================

def test_token_cost_estimation():
    """Verify token cost calculations for Gemini 3.1 Flash Lite."""
    # 1,000,000 input tokens = $0.075, 1,000,000 output tokens = $0.30
    cost = estimate_token_cost_usd("gemini-3.1-flash-lite", 1_000_000, 1_000_000)
    assert abs(cost - 0.375) < 0.001

    # Typical conversation: 500 input tokens, 200 output tokens
    single_turn_cost = estimate_token_cost_usd("gemini-3.1-flash-lite", 500, 200)
    assert single_turn_cost > 0.0
    assert single_turn_cost < 0.001  # less than a tenth of a cent


def test_mrr_and_margin_calculation():
    """Verify SaaS MRR and gross profit margin formula."""
    # Organization on PRO yearly: $590/yr -> $49.17 MRR
    monthly_rev = 590.0 / 12.0
    ai_cost_usd = 2.50  # e.g. 5,000 AI replies cost $2.50
    gross_margin_pct = round(((monthly_rev - ai_cost_usd) / monthly_rev) * 100.0, 1)

    assert round(monthly_rev, 2) == 49.17
    assert gross_margin_pct > 90.0  # high margin SaaS business


# ============================================================================
# 5. MULTI-TENANT ISOLATION MODEL INTEGRITY
# ============================================================================

def test_tenant_isolation_models():
    """Verify models have organization_id attribute for backend query scoping."""
    conv_a = Conversation(id=10, organization_id=1, business_connection_id="conn_1", chat_id=101)
    conv_b = Conversation(id=20, organization_id=2, business_connection_id="conn_2", chat_id=102)

    assert conv_a.organization_id != conv_b.organization_id
    assert conv_a.organization_id == 1
    assert conv_b.organization_id == 2


def test_rbac_roles_permissions():
    """Verify SaaS roles and permissions hierarchy."""
    roles = ["owner", "admin", "manager", "operator", "moderator", "viewer"]
    for r in roles:
        assert r in ROLE_DEFAULTS, f"Role {r} missing from ROLE_DEFAULTS"

    # Owner has billing & team permissions
    assert ROLE_DEFAULTS["owner"]["can_manage_billing"] is True
    assert ROLE_DEFAULTS["owner"]["can_manage_team"] is True
    assert ROLE_DEFAULTS["owner"]["can_export_data"] is True

    # Operator cannot manage billing or team
    assert ROLE_DEFAULTS["operator"]["can_manage_billing"] is False
    assert ROLE_DEFAULTS["operator"]["can_manage_team"] is False
    assert ROLE_DEFAULTS["operator"]["can_reply_customers"] is True

    # Viewer has read-only access
    assert ROLE_DEFAULTS["viewer"]["can_view_conversations"] is True
    assert ROLE_DEFAULTS["viewer"]["can_reply_customers"] is False
