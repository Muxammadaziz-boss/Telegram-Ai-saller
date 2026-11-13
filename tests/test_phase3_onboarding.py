"""Tests for Bosqich 3: Store Creation (Onboarding), Telegram Bot Token Verification,
Fernet Encryption, Webhook Secret Generation, and Webhook Management.
"""

import os
from unittest.mock import AsyncMock, patch
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.core.security import hash_password
from app.dependencies.auth import create_access_token
from app.models import ConnectedChannel, Organization, OrganizationMember, Subscription, User

test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


# ===========================================================================
# 1. Telegram Bot Token Verification (/api/organizations/verify-token)
# ===========================================================================

@pytest.mark.anyio
async def test_verify_bot_token_format_validation():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        user = User(
            email=f"bot_tester_{pid}@ai-sales.uz",
            full_name="Bot Tester",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}"}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # Empty / invalid format (no colon)
            res = await client.post(
                "/api/organizations/verify-token",
                json={"token": "invalid_no_colon_token"},
                headers=headers,
            )
            assert res.status_code == 400


@pytest.mark.anyio
async def test_verify_bot_token_live_mock():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        user = User(
            email=f"bot_tester_mock_{pid}@ai-sales.uz",
            full_name="Bot Tester Mock",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}"}

        mock_response = httpx.Response(
            status_code=200,
            json={
                "ok": True,
                "result": {
                    "id": 987654321,
                    "first_name": "AI Test Seller Bot",
                    "username": "ai_test_seller_bot",
                    "can_join_groups": True,
                    "can_read_all_group_messages": False,
                    "supports_inline_queries": False,
                },
            },
            request=httpx.Request("GET", "https://api.telegram.org/bot123/getMe"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post(
                    "/api/organizations/verify-token",
                    json={"token": "123456789:ABCDefGhiJklMnoPQRsTuVwXyZ"},
                    headers=headers,
                )
                assert res.status_code == 200
                data = res.json()
                assert data["valid"] is True
                assert data["bot_username"] == "ai_test_seller_bot"
                assert data["bot_id"] == 987654321


# ===========================================================================
# 2. Store Creation with Bot Token, Channel, and Encryption
# ===========================================================================

@pytest.mark.anyio
async def test_create_organization_with_bot_token_and_channel():
    pid = os.getpid()
    raw_bot_token = "555123456:AAGHJKLMNOpqrs_tuvwxyz123456"

    async with core_db.SessionLocal() as session:
        user = User(
            email=f"store_owner_{pid}@ai-sales.uz",
            full_name="Store Owner",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        token = create_access_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}"}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/api/organizations",
                json={
                    "name": "Parfyumeriya Do'koni",
                    "slug": f"parfume-shop-{pid}",
                    "category": "Parfyumeriya",
                    "plan_code": "start",
                    "telegram_bot_token": raw_bot_token,
                    "telegram_channel": "parfume_uz",
                    "ai_language": "uz",
                    "ai_personality": "polite",
                    "custom_system_prompt": "Mijozlarga xushmuomala bo'ling va parfyum xususiyatlarini tushuntiring.",
                },
                headers=headers,
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "created"
            org_info = data["organization"]
            assert org_info["name"] == "Parfyumeriya Do'koni"
            assert org_info["slug"] == f"parfume-shop-{pid}"
            assert org_info["telegram_bot_token_set"] is True
            assert org_info["webhook_secret_set"] is True
            # Plaintext token must NEVER leak in response
            assert "telegram_bot_token" not in org_info
            created_org_id = org_info["id"]

        # Verify Database state
        org_db = await session.get(Organization, created_org_id)
        assert org_db is not None
        # Plaintext is not stored directly
        assert org_db.telegram_bot_token != raw_bot_token
        # Decrypted property matches original token
        assert org_db.decrypted_bot_token == raw_bot_token
        # Webhook secret is generated (min 32 chars)
        assert org_db.webhook_secret is not None
        assert len(org_db.webhook_secret) >= 32

        # Verify connected channel was auto-registered
        chan_res = await session.execute(
            select(ConnectedChannel).where(ConnectedChannel.organization_id == created_org_id)
        )
        chan = chan_res.scalar_one_or_none()
        assert chan is not None
        assert chan.channel_username == "parfume_uz"

        # Verify 7-day trial subscription was created
        sub_res = await session.execute(
            select(Subscription).where(Subscription.organization_id == created_org_id)
        )
        sub = sub_res.scalar_one_or_none()
        assert sub is not None
        assert sub.status == "trialing"


# ===========================================================================
# 3. Organization Current Details & Settings Update
# ===========================================================================

@pytest.mark.anyio
async def test_update_current_organization_settings_and_bot_token():
    pid = os.getpid()
    new_token = "777888999:BBBCccDddEeeFffGggHhhIiiJjj"

    async with core_db.SessionLocal() as session:
        org = Organization(
            name="Moda Brendi",
            slug=f"fashion-brand-{pid}",
        )
        session.add(org)

        user = User(
            email=f"fashion_admin_{pid}@ai-sales.uz",
            full_name="Fashion Admin",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(org)
        await session.refresh(user)

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role="owner",
            permissions={"can_manage_settings": True, "can_manage_billing": True},
        )
        session.add(member)
        await session.commit()

        token = create_access_token(user.id, user.email)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": str(org.id),
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Update settings
            update_res = await client.put(
                f"/api/organizations/current?organization_id={org.id}",
                json={
                    "telegram_bot_token": new_token,
                    "custom_system_prompt": "Kiyimlar bo'yicha maslahat bering.",
                    "ai_personality": "friendly",
                },
                headers=headers,
            )
            assert update_res.status_code == 200
            up_data = update_res.json()
            assert up_data["status"] == "updated"
            assert up_data["organization"]["telegram_bot_token_set"] is True
            assert up_data["organization"]["custom_system_prompt"] == "Kiyimlar bo'yicha maslahat bering."

            # 2. GET current organization details
            get_res = await client.get(
                f"/api/organizations/current?organization_id={org.id}",
                headers=headers,
            )
            assert get_res.status_code == 200
            current_org = get_res.json()
            assert current_org["id"] == org.id
            assert current_org["telegram_bot_token_set"] is True
            assert current_org["webhook_secret_set"] is True
            assert current_org["custom_system_prompt"] == "Kiyimlar bo'yicha maslahat bering."
            assert f"/telegram/webhook/{org.slug}" in current_org["webhook_url"]

        # Verify DB decrypted bot token
        await session.refresh(org)
        assert org.decrypted_bot_token == new_token


# ===========================================================================
# 4. Telegram Webhook Management & Isolation
# ===========================================================================

@pytest.mark.anyio
async def test_set_webhook_and_status_endpoints():
    pid = os.getpid()
    bot_token = "888111222:QQQRRRSssTTTUUUvvvWWWxxxYYY"

    async with core_db.SessionLocal() as session:
        org = Organization(
            name="Texnika Markazi",
            slug=f"tech-hub-{pid}",
        )
        session.add(org)
        user = User(
            email=f"tech_boss_{pid}@ai-sales.uz",
            full_name="Tech Boss",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(org)
        await session.refresh(user)

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            role="owner",
            permissions={"can_manage_settings": True},
        )
        session.add(member)
        await session.commit()

        # Update bot token on org
        from app.core.security import encrypt_secret
        org.telegram_bot_token = encrypt_secret(bot_token)
        import secrets
        org.webhook_secret = secrets.token_urlsafe(32)
        await session.commit()

        token = create_access_token(user.id, user.email)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": str(org.id),
        }

        # Mock TelegramService methods
        with patch("app.services.telegram.TelegramService.set_webhook", new_callable=AsyncMock) as mock_set_wh, \
             patch("app.services.telegram.TelegramService.get_webhook_info", new_callable=AsyncMock) as mock_wh_info:

            mock_set_wh.return_value = {"ok": True, "result": True, "description": "Webhook was set"}
            mock_wh_info.return_value = {
                "url": f"https://api.aisales.uz/telegram/webhook/{org.slug}",
                "has_custom_certificate": False,
                "pending_update_count": 0,
            }

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                # 1. Set Webhook
                set_res = await client.post(
                    f"/api/organizations/{org.id}/set-webhook",
                    headers=headers,
                )
                assert set_res.status_code == 200
                set_data = set_res.json()
                assert set_data["status"] == "ok"
                assert org.slug in set_data["webhook_url"]
                assert set_data["secret_configured"] is True
                mock_set_wh.assert_awaited_once()

                # 2. Get Webhook Status
                status_res = await client.get(
                    f"/api/organizations/{org.id}/webhook-status",
                    headers=headers,
                )
                assert status_res.status_code == 200
                status_data = status_res.json()
                assert status_data["configured"] is True
                assert status_data["has_webhook_secret"] is True
                assert status_data["webhook_info"]["url"] == f"https://api.aisales.uz/telegram/webhook/{org.slug}"
                mock_wh_info.assert_awaited_once()


@pytest.mark.anyio
async def test_tenant_cannot_manage_another_organizations_webhook():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        # Org 1
        org1 = Organization(name="Org One", slug=f"org-one-{pid}")
        session.add(org1)
        user1 = User(
            email=f"user_one_{pid}@ai-sales.uz",
            full_name="User One",
            hashed_password=hash_password("Pass123!"),
        )
        session.add(user1)

        # Org 2
        org2 = Organization(name="Org Two", slug=f"org-two-{pid}")
        session.add(org2)

        await session.commit()
        await session.refresh(org1)
        await session.refresh(user1)
        await session.refresh(org2)

        # User 1 is member only in Org 1
        m1 = OrganizationMember(organization_id=org1.id, user_id=user1.id, role="owner", permissions={"can_manage_settings": True})
        session.add(m1)
        await session.commit()

        token1 = create_access_token(user1.id, user1.email)
        headers_attempting_org2 = {
            "Authorization": f"Bearer {token1}",
            "X-Organization-Id": str(org2.id),  # Attempting to act on Org 2
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # User 1 tries to call set-webhook on Org 2
            res = await client.post(
                f"/api/organizations/{org2.id}/set-webhook",
                headers=headers_attempting_org2,
            )
            # Must be rejected (403 or 404)
            assert res.status_code in (403, 404)
