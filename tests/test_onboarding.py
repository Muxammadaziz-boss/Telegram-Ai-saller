import pytest
import httpx
from datetime import datetime, timezone
from app.main import app
from app.core.config import settings
from app.dependencies.auth import create_access_token, decode_access_token


def test_jwt_create_and_decode():
    token = create_access_token(user_id=42, email="test@domain.com")
    assert isinstance(token, str)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["email"] == "test@domain.com"
    assert payload["exp"] > datetime.now(timezone.utc).timestamp()


@pytest.mark.anyio
async def test_auth_and_organization_onboarding_lifecycle():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register a new user
        test_email = f"owner_{int(datetime.now().timestamp())}@shop.uz"
        reg_resp = await client.post("/api/v1/auth/register", json={
            "email": test_email,
            "password": "securepassword123",
            "full_name": "Aziz Qodirov",
        })
        assert reg_resp.status_code == 200, reg_resp.text
        data = reg_resp.json()
        assert "access_token" in data
        assert data["email"] == test_email
        token = data["access_token"]

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get current user profile
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == test_email

        # 3. Create an organization with dedicated bot token & AI keys
        slug = f"shop-{int(datetime.now().timestamp())}"
        custom_bot_token = f"998877:{slug}"
        org_resp = await client.post("/api/v1/organizations", headers=headers, json={
            "name": "Super Mega Store",
            "slug": slug,
            "category": "Electronics",
            "ai_language": "uz",
            "ai_personality": "Friendly & Helpful",
            "custom_system_prompt": "Har doim xushmuomala bo'l va chegirmalarni eslat.",
            "telegram_bot_token": custom_bot_token,
            "gemini_api_key": "GEMINI_CUSTOM_KEY_123",
            "openai_api_key": "OPENAI_CUSTOM_KEY_456",
        })
        assert org_resp.status_code == 201, org_resp.text
        org_data = org_resp.json()
        org_id = org_data["id"]
        assert org_data["name"] == "Super Mega Store"
        assert org_data["slug"] == slug
        # Keys and tokens should be masked as booleans in output for security
        assert org_data["telegram_bot_token_set"] is True
        assert org_data["gemini_api_key_set"] is True
        assert org_data["openai_api_key_set"] is True
        assert "GEMINI_CUSTOM_KEY_123" not in str(org_data)  # Never leak real key in response

        # 4. Duplicate slug should be rejected
        dup_slug_resp = await client.post("/api/v1/organizations", headers=headers, json={
            "name": "Another Store",
            "slug": slug,
        })
        assert dup_slug_resp.status_code == 400
        assert "allaqachon band" in dup_slug_resp.json()["detail"]

        # 5. Duplicate bot token should be rejected across organizations
        dup_token_resp = await client.post("/api/v1/organizations", headers=headers, json={
            "name": "Another Store",
            "slug": f"another-{slug}",
            "telegram_bot_token": custom_bot_token,
        })
        assert dup_token_resp.status_code == 400
        assert "boshqa tashkilotda ishlatilmoqda" in dup_token_resp.json()["detail"]

        # 6. List user's organizations
        list_resp = await client.get("/api/v1/organizations", headers=headers)
        assert list_resp.status_code == 200
        org_list = list_resp.json()
        assert any(o["id"] == org_id for o in org_list)

        # 7. Update organization credentials via website/dashboard
        patch_resp = await client.patch(f"/api/v1/organizations/{org_id}", headers=headers, json={
            "name": "Super Mega Store Renovated",
            "telegram_bot_token": f"776655:updated-{slug}",
            "gemini_api_key": "UPDATED_GEMINI_KEY_789",
        })
        assert patch_resp.status_code == 200
        updated = patch_resp.json()
        assert updated["name"] == "Super Mega Store Renovated"
        assert updated["telegram_bot_token_set"] is True
        assert updated["gemini_api_key_set"] is True

        # 8. Unauthenticated access without JWT should be rejected
        unauth_resp = await client.get("/api/v1/organizations")
        assert unauth_resp.status_code == 401 or unauth_resp.status_code == 403
