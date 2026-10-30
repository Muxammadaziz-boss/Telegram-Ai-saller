import pytest
from app.core.config import settings
from app.core.permissions import ALL_PERMISSIONS, ROLE_DEFAULTS
from app.models import Admin
from app.services import admin_service


def test_permission_defaults_and_labels():
    assert "can_view_conversations" in ALL_PERMISSIONS
    assert "can_manage_admins" in ALL_PERMISSIONS
    assert ROLE_DEFAULTS["owner"]["can_manage_admins"] is True
    assert ROLE_DEFAULTS["admin"]["can_manage_admins"] is False
    assert ROLE_DEFAULTS["moderator"]["can_manage_knowledge"] is False


def test_has_permission():
    owner = Admin(
        telegram_user_id=123,
        role="owner",
        permissions=ROLE_DEFAULTS["owner"],
        is_active=True,
    )
    assert admin_service.has_permission(owner, "can_manage_admins") is True
    assert admin_service.has_permission(owner, "any_perm") is True

    moderator = Admin(
        telegram_user_id=456,
        role="moderator",
        permissions=ROLE_DEFAULTS["moderator"],
        is_active=True,
    )
    assert admin_service.has_permission(moderator, "can_view_conversations") is True
    assert admin_service.has_permission(moderator, "can_manage_admins") is False

    inactive = Admin(
        telegram_user_id=789,
        role="admin",
        permissions=ROLE_DEFAULTS["admin"],
        is_active=False,
    )
    assert admin_service.has_permission(inactive, "can_view_conversations") is False
    assert admin_service.has_permission(None, "can_view_conversations") is False
