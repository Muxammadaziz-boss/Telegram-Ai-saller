import pytest
from app.core.permissions import ALL_PERMISSIONS, ROLE_DEFAULTS
from app.models import Admin
from app.services import admin_service
from app.services.settings_service import clean_channel_username


def test_clean_channel_username():
    assert clean_channel_username("https://t.me/OPTOM_LAPTOP_UZ") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("https://t.me/OPTOM_LAPTOP_UZ/") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("http://t.me/OPTOM_LAPTOP_UZ") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("t.me/OPTOM_LAPTOP_UZ") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("@OPTOM_LAPTOP_UZ") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("OPTOM_LAPTOP_UZ") == "OPTOM_LAPTOP_UZ"
    assert clean_channel_username("  https://t.me/my_channel/  ") == "my_channel"
    assert clean_channel_username("") == ""


def test_settings_permission():
    assert "can_manage_settings" in ALL_PERMISSIONS
    assert ROLE_DEFAULTS["owner"]["can_manage_settings"] is True
    assert ROLE_DEFAULTS["admin"]["can_manage_settings"] is True
    assert ROLE_DEFAULTS["moderator"]["can_manage_settings"] is False

    admin = Admin(
        telegram_user_id=123,
        role="admin",
        permissions=ROLE_DEFAULTS["admin"],
        is_active=True,
    )
    assert admin_service.has_permission(admin, "can_manage_settings") is True

    moderator = Admin(
        telegram_user_id=456,
        role="moderator",
        permissions=ROLE_DEFAULTS["moderator"],
        is_active=True,
    )
    assert admin_service.has_permission(moderator, "can_manage_settings") is False
