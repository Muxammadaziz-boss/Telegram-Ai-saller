from datetime import datetime, timezone
import pytest
import httpx
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import Settings, settings
from app.dependencies.auth import create_access_token
from app.models import (
    BusinessConnection,
    Conversation,
    Message,
    Organization,
    OrganizationMember,
    User,
)

# Use NullPool in tests to avoid asyncpg connection sharing across separate event loops
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app



# ---------------------------------------------------------------------------
# Task 1: Telegram Webhook Authentication Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_webhook_secret_missing_rejected():
    """1. Missing Telegram webhook secret must return 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/telegram/webhook", json={"update_id": 99991})
        assert resp.status_code == 401
        assert "secret" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_webhook_secret_incorrect_rejected():
    """2. Incorrect Telegram webhook secret must return 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "invalid_attacker_token_xyz"},
            json={"update_id": 99992},
        )
        assert resp.status_code == 401
        assert "secret" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_webhook_secret_valid_accepted():
    """3. Valid Telegram webhook secret token must return 200 OK."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": settings.telegram_webhook_secret},
            json={"update_id": 99993},
        )
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}


# ---------------------------------------------------------------------------
# Task 2: Authentication & Header Impersonation Removal Tests
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_admin_auth_without_credentials_rejected():
    """4. Admin authentication without credentials must return 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/admin/overview")
        assert resp.status_code == 401
        assert "avtorizatsiya" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_rejected_x_admin_telegram_id_impersonation():
    """5. Supplying X-Admin-Telegram-ID without verified credentials must be rejected with 401."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/admin/overview",
            headers={"X-Admin-Telegram-ID": "6990611858"},
        )
        assert resp.status_code == 401
        assert "avtorizatsiya" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Task 3: Tenant Isolation & IDOR Protection Tests
# ---------------------------------------------------------------------------

@pytest.fixture
async def multi_tenant_fixture():
    """Create two isolated test organizations, users, and conversations."""
    ts = int(datetime.now().timestamp() * 1000)
    async with core_db.SessionLocal() as db:
        # Create Org A & Owner A
        org_a = Organization(
            name=f"Org A {ts}",
            slug=f"org-a-{ts}",
            category="Retail",
        )
        user_a = User(
            email=f"user_a_{ts}@tenant-test.com",
            full_name="User A",
            is_active=True,
            is_platform_owner=False,
        )
        db.add_all([org_a, user_a])
        await db.flush()

        member_a = OrganizationMember(
            organization_id=org_a.id,
            user_id=user_a.id,
            role="owner",
            is_active=True,
        )
        db.add(member_a)

        # Create Org B & Owner B
        org_b = Organization(
            name=f"Org B {ts}",
            slug=f"org-b-{ts}",
            category="Wholesale",
        )
        user_b = User(
            email=f"user_b_{ts}@tenant-test.com",
            full_name="User B",
            is_active=True,
            is_platform_owner=False,
        )
        db.add_all([org_b, user_b])
        await db.flush()

        member_b = OrganizationMember(
            organization_id=org_b.id,
            user_id=user_b.id,
            role="owner",
            is_active=True,
        )
        db.add(member_b)

        # Create BusinessConnection & Conversation for Org B
        conn_b = BusinessConnection(
            id=f"conn_b_{ts}",
            organization_id=org_b.id,
            is_enabled=True,
            rights={},
        )
        db.add(conn_b)
        await db.flush()

        conv_b = Conversation(
            organization_id=org_b.id,
            business_connection_id=conn_b.id,
            chat_id=888000 + (ts % 10000),
            customer_name="Customer of Org B",
            status="ai_active",
        )
        db.add(conv_b)
        await db.flush()

        msg_b = Message(
            organization_id=org_b.id,
            conversation_id=conv_b.id,
            telegram_message_id=1,
            direction="customer",
            text="Private message intended exclusively for Org B",
        )
        db.add(msg_b)

        await db.commit()

        token_a = create_access_token(user_a.id, user_a.email)
        token_b = create_access_token(user_b.id, user_b.email)

        cleanup_ids = {
            "msg_b": msg_b.id,
            "conv_b": conv_b.id,
            "conn_b": conn_b.id,
            "member_a": member_a.id,
            "member_b": member_b.id,
            "user_a": user_a.id,
            "user_b": user_b.id,
            "org_a": org_a.id,
            "org_b": org_b.id,
        }

    yield {
        "org_a": org_a,
        "user_a": user_a,
        "token_a": token_a,
        "org_b": org_b,
        "user_b": user_b,
        "token_b": token_b,
        "conv_b": conv_b,
        "msg_b": msg_b,
    }

    # Clean, isolated deletion
    try:
        async with core_db.SessionLocal() as cleanup_db:
            await cleanup_db.execute(delete(Message).where(Message.id == cleanup_ids["msg_b"]))
            await cleanup_db.execute(delete(Conversation).where(Conversation.id == cleanup_ids["conv_b"]))
            await cleanup_db.execute(delete(BusinessConnection).where(BusinessConnection.id == cleanup_ids["conn_b"]))
            await cleanup_db.execute(delete(OrganizationMember).where(OrganizationMember.id.in_([cleanup_ids["member_a"], cleanup_ids["member_b"]])))
            await cleanup_db.execute(delete(User).where(User.id.in_([cleanup_ids["user_a"], cleanup_ids["user_b"]])))
            await cleanup_db.execute(delete(Organization).where(Organization.id.in_([cleanup_ids["org_a"], cleanup_ids["org_b"]])))
            await cleanup_db.commit()
    except Exception:
        pass


@pytest.mark.anyio
async def test_org_a_cannot_list_org_b_conversations(multi_tenant_fixture):
    """6. Organization A operator querying /admin/conversations must NOT see Organization B conversations."""
    data = multi_tenant_fixture
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/admin/conversations",
            headers={"Authorization": f"Bearer {data['token_a']}"},
        )
        assert resp.status_code == 200
        conv_list = resp.json()
        org_b_conv_ids = [c["id"] for c in conv_list if c["id"] == data["conv_b"].id]
        assert len(org_b_conv_ids) == 0, "Security Violation: Org A listed Org B's conversation!"


@pytest.mark.anyio
async def test_org_a_cannot_read_org_b_messages(multi_tenant_fixture):
    """7. Organization A operator requesting /admin/conversations/{id}/messages for Org B must receive 404."""
    data = multi_tenant_fixture
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/admin/conversations/{data['conv_b'].id}/messages",
            headers={"Authorization": f"Bearer {data['token_a']}"},
        )
        assert resp.status_code == 404
        assert "topilmadi" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_org_a_cannot_takeover_org_b_conversation(multi_tenant_fixture):
    """8. Organization A operator attempting takeover of Org B conversation must receive 404."""
    data = multi_tenant_fixture
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/admin/conversations/{data['conv_b'].id}/takeover",
            headers={"Authorization": f"Bearer {data['token_a']}"},
            json={"reason": "Malicious takeover attempt"},
        )
        assert resp.status_code == 404
        assert "topilmadi" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_org_a_cannot_reply_to_org_b_customer(multi_tenant_fixture):
    """9. Organization A operator attempting to reply to Org B conversation must receive 404."""
    data = multi_tenant_fixture
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            f"/admin/conversations/{data['conv_b'].id}/reply",
            headers={"Authorization": f"Bearer {data['token_a']}"},
            json={"text": "Forged cross-tenant reply attempt"},
        )
        assert resp.status_code == 404
        assert "topilmadi" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_arbitrary_x_organization_id_cannot_switch_tenants(multi_tenant_fixture):
    """10. Supplying arbitrary X-Organization-Id without verified membership must be rejected with 403."""
    data = multi_tenant_fixture
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/admin/overview",
            headers={
                "Authorization": f"Bearer {data['token_a']}",
                "X-Organization-Id": str(data["org_b"].id),
            },
        )
        assert resp.status_code == 403
        assert "a'zosi emassiz" in resp.json()["detail"].lower()


@pytest.mark.anyio
async def test_user_without_membership_cannot_access_organization():
    """11. A user with no active organization memberships must receive 403."""
    ts = int(datetime.now().timestamp() * 1000)
    orphan_id = None
    async with core_db.SessionLocal() as db:
        orphan_user = User(
            email=f"orphan_{ts}@tenant-test.com",
            full_name="Orphan User",
            is_active=True,
            is_platform_owner=False,
        )
        db.add(orphan_user)
        await db.commit()
        orphan_id = orphan_user.id
        orphan_token = create_access_token(orphan_user.id, orphan_user.email)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/admin/overview",
            headers={"Authorization": f"Bearer {orphan_token}"},
        )
        assert resp.status_code in (403, 401)

    if orphan_id:
        try:
            async with core_db.SessionLocal() as cleanup_db:
                await cleanup_db.execute(delete(User).where(User.id == orphan_id))
                await cleanup_db.commit()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Task 4 & 5: Proxy, Session & Production Secret Tests
# ---------------------------------------------------------------------------

def test_production_startup_rejects_missing_jwt_secret():
    """14a. Production startup rejects missing/weak JWT secret."""
    with pytest.raises(ValueError, match="Production security failure: JWT_SECRET"):
        Settings(
            app_env="production",
            jwt_secret="short",
            telegram_webhook_secret="strong_webhook_secret_123456",
            admin_api_token="strong_admin_api_token_123456",
            database_url="postgresql+asyncpg://user:pass@db:5432/db",
        )


def test_production_startup_rejects_weak_webhook_secret():
    """14b. Production startup rejects missing/weak webhook secret."""
    with pytest.raises(ValueError, match="Production security failure: TELEGRAM_WEBHOOK_SECRET"):
        Settings(
            app_env="production",
            jwt_secret="this_is_a_very_long_valid_jwt_secret_32_chars_ok",
            telegram_webhook_secret="short",
            admin_api_token="strong_admin_api_token_123456",
            database_url="postgresql+asyncpg://user:pass@db:5432/db",
        )


def test_production_startup_rejects_default_db_credentials():
    """14c. Production startup rejects default local dev database credentials."""
    with pytest.raises(ValueError, match="DATABASE_URL contains default development credentials"):
        Settings(
            app_env="production",
            jwt_secret="this_is_a_very_long_valid_jwt_secret_32_chars_ok",
            telegram_webhook_secret="strong_webhook_secret_123456",
            admin_api_token="strong_admin_api_token_123456",
            database_url="postgresql+asyncpg://sales:sales_local_dev_password@localhost:5432/aisales",
        )


def test_session_identity_binding_contract():
    """13. Validate that session payload structure requires explicit user identity binding."""
    from app.dependencies.auth import decode_access_token, create_access_token
    token = create_access_token(user_id=101, email="operator@tenant.uz")
    payload = decode_access_token(token)
    assert payload["sub"] == "101"
    assert payload["email"] == "operator@tenant.uz"
    assert "exp" in payload
