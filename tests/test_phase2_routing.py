"""Tests for Bosqich 2: Two-Zone Routing, Platform Owner Control Center, and Tenant Impersonation."""

import os
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.core.security import hash_password
from app.dependencies.auth import create_access_token
from app.models import AuditLog, Organization, OrganizationMember, User

# NullPool in tests to avoid connection leaks across async loops
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


# ===========================================================================
# 1. Platform Owner Impersonation & Audit Trail
# ===========================================================================

@pytest.mark.anyio
async def test_platform_owner_can_impersonate_store_and_logs_audit():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        # Create target store
        target_store = Organization(
            name="Impersonation Target Store",
            slug=f"target-store-{pid}",
        )
        session.add(target_store)

        # Create Platform Owner
        platform_owner = User(
            email=f"platform_boss_{pid}@ai-sales.uz",
            full_name="Platform Chief",
            hashed_password=hash_password("SuperSecret123!"),
            is_platform_owner=True,
        )
        session.add(platform_owner)
        await session.commit()
        await session.refresh(target_store)
        await session.refresh(platform_owner)

        token = create_access_token(platform_owner.id, platform_owner.email)
        headers = {"Authorization": f"Bearer {token}"}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/platform/organizations/{target_store.slug}/impersonate",
                headers=headers,
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "ok"
            assert data["organization"]["id"] == target_store.id
            assert data["organization"]["slug"] == target_store.slug

        # Verify audit log was created in database
        stmt = (
            select(AuditLog)
            .where(AuditLog.organization_id == target_store.id)
            .where(AuditLog.action == "platform_owner_enter_store")
        )
        audit_res = await session.execute(stmt)
        audit = audit_res.scalar_one_or_none()
        assert audit is not None
        assert audit.resource == "organization"
        assert audit.resource_id == str(target_store.id)
        assert audit.metadata_json["impersonated_by_user_id"] == platform_owner.id


@pytest.mark.anyio
async def test_tenant_owner_cannot_impersonate_stores():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        store1 = Organization(
            name="Store 1",
            slug=f"store-1-{pid}",
        )
        store2 = Organization(
            name="Store 2",
            slug=f"store-2-{pid}",
        )
        session.add_all([store1, store2])

        # Regular user who is only owner of store 1
        regular_user = User(
            email=f"regular_tenant_{pid}@test.com",
            full_name="Regular Merchant",
            hashed_password=hash_password("password123"),
            is_platform_owner=False,
        )
        session.add(regular_user)
        await session.flush()

        member = OrganizationMember(
            organization_id=store1.id,
            user_id=regular_user.id,
            role="owner",
            permissions={"can_manage_settings": True},
        )
        session.add(member)
        await session.commit()
        await session.refresh(store2)

        token = create_access_token(regular_user.id, regular_user.email)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": str(store1.id),
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                f"/api/platform/organizations/{store2.slug}/impersonate",
                headers=headers,
            )
            assert resp.status_code == 403
            assert "Faqat Platforma egasi" in resp.json()["detail"]


# ===========================================================================
# 2. Platform Users List API
# ===========================================================================

@pytest.mark.anyio
async def test_platform_users_list_accessible_only_to_platform_owner():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        owner = User(
            email=f"owner_users_{pid}@platform.com",
            full_name="Platform Admin",
            hashed_password=hash_password("password"),
            is_platform_owner=True,
        )
        user = User(
            email=f"client_users_{pid}@client.com",
            full_name="Client User",
            hashed_password=hash_password("password"),
            is_platform_owner=False,
        )
        session.add_all([owner, user])
        await session.commit()
        await session.refresh(owner)
        await session.refresh(user)

        owner_token = create_access_token(owner.id, owner.email)
        user_token = create_access_token(user.id, user.email)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Platform owner should receive 200 with list
            resp_owner = await client.get(
                "/api/platform/users",
                headers={"Authorization": f"Bearer {owner_token}"},
            )
            assert resp_owner.status_code == 200
            data = resp_owner.json()
            assert "users" in data
            emails = [u["email"] for u in data["users"]]
            assert owner.email in emails
            assert user.email in emails

            # 2. Non-platform owner should receive 403
            resp_user = await client.get(
                "/api/platform/users",
                headers={"Authorization": f"Bearer {user_token}"},
            )
            assert resp_user.status_code == 403


# ===========================================================================
# 3. Platform System Health API
# ===========================================================================

@pytest.mark.anyio
async def test_platform_system_health():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        owner = User(
            email=f"health_owner_{pid}@platform.com",
            full_name="Health Check Owner",
            hashed_password=hash_password("password"),
            is_platform_owner=True,
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)

        token = create_access_token(owner.id, owner.email)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/platform/system-health",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
            health = resp.json()
            assert health["status"] == "ok"
            assert health["database"] == "healthy"
            assert "gemini_configured" in health
            assert "openai_configured" in health
            assert "telegram_configured" in health


# ===========================================================================
# 4. Platform Audit Logs API
# ===========================================================================

@pytest.mark.anyio
async def test_platform_audit_logs_listing():
    pid = os.getpid()
    async with core_db.SessionLocal() as session:
        owner = User(
            email=f"audit_owner_{pid}@platform.com",
            full_name="Audit Owner",
            hashed_password=hash_password("password"),
            is_platform_owner=True,
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)

        token = create_access_token(owner.id, owner.email)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                "/api/platform/audit-logs",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "logs" in data
            assert isinstance(data["logs"], list)
