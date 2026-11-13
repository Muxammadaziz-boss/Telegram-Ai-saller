"""Tests for Phase 5: Platform Owner Store CRUD, Lifecycle Management, and N+1 Optimization."""

import os
import uuid
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.core.security import hash_password
from app.dependencies.auth import create_access_token
from app.models import AuditLog, Organization, OrganizationMember, Plan, Subscription, SystemSetting, User

test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


@pytest.mark.anyio
async def test_platform_owner_can_create_store_with_all_entities():
    uid = uuid.uuid4().hex[:6]
    async with core_db.SessionLocal() as session:
        # Create platform owner
        owner = User(
            email=f"powner_{uid}@saas.uz",
            full_name="Platform Super Owner",
            hashed_password=hash_password("OwnerPassword123!"),
            is_platform_owner=True,
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)

    token = create_access_token(owner.id, owner.email)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": f"Samarkand Electronics {uid}",
        "slug": f"samarkand-elec-{uid}",
        "category": "Elektronika",
        "currency": "UZS",
        "plan_code": "pro",
        "owner_email": f"merchant_{uid}@samarkand.uz",
        "owner_password": "MerchantSecretPassword2026",
    }

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/platform/organizations", json=payload, headers=headers)
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["status"] == "created"
        created_org = data["organization"]
        assert created_org["name"] == payload["name"]
        assert created_org["slug"] == payload["slug"]
        assert created_org["currency"] == "UZS"
        assert created_org["plan"] == "PRO"
        new_org_id = created_org["id"]

    # Verify database persistence
    async with core_db.SessionLocal() as session:
        org = await session.get(Organization, new_org_id)
        assert org is not None
        assert org.name == payload["name"]
        assert org.webhook_secret is not None

        # Verify owner user created
        u_res = await session.execute(select(User).where(User.email == payload["owner_email"]))
        merchant_user = u_res.scalar_one_or_none()
        assert merchant_user is not None
        assert merchant_user.is_platform_owner is False

        # Verify organization member
        m_res = await session.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == new_org_id,
                OrganizationMember.user_id == merchant_user.id,
            )
        )
        mem = m_res.scalar_one_or_none()
        assert mem is not None
        assert mem.role == "owner"

        # Verify subscription
        s_res = await session.execute(select(Subscription).where(Subscription.organization_id == new_org_id))
        sub = s_res.scalar_one_or_none()
        assert sub is not None
        assert sub.status == "active"

        # Verify currency setting
        cs_res = await session.execute(select(SystemSetting).where(SystemSetting.key == f"store_currency_{new_org_id}"))
        c_set = cs_res.scalar_one_or_none()
        assert c_set is not None
        assert c_set.value == "UZS"

        # Clean up
        await session.delete(org)
        await session.delete(merchant_user)
        await session.delete(owner)
        await session.commit()


@pytest.mark.anyio
async def test_platform_owner_can_suspend_and_reactivate_store():
    uid = uuid.uuid4().hex[:6]
    async with core_db.SessionLocal() as session:
        org = Organization(name=f"Suspend Test {uid}", slug=f"suspend-test-{uid}", status="active")
        owner = User(
            email=f"owner_susp_{uid}@saas.uz",
            full_name="Boss",
            hashed_password=hash_password("Pwd123!"),
            is_platform_owner=True,
        )
        session.add_all([org, owner])
        await session.commit()
        await session.refresh(org)
        await session.refresh(owner)

    token = create_access_token(owner.id, owner.email)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Suspend
        resp = await client.patch(
            f"/api/platform/organizations/{org.id}/status",
            json={"status": "suspended"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["new_status"] == "suspended"

        # Reactivate
        resp2 = await client.patch(
            f"/api/platform/organizations/{org.id}/status",
            json={"status": "active"},
            headers=headers,
        )
        assert resp2.status_code == 200
        assert resp2.json()["new_status"] == "active"

    # Clean up
    async with core_db.SessionLocal() as session:
        o = await session.get(Organization, org.id)
        u = await session.get(User, owner.id)
        if o:
            await session.delete(o)
        if u:
            await session.delete(u)
        await session.commit()


@pytest.mark.anyio
async def test_platform_owner_can_delete_store():
    uid = uuid.uuid4().hex[:6]
    async with core_db.SessionLocal() as session:
        org = Organization(name=f"Delete Test {uid}", slug=f"delete-test-{uid}")
        owner = User(
            email=f"owner_del_{uid}@saas.uz",
            full_name="Boss",
            hashed_password=hash_password("Pwd123!"),
            is_platform_owner=True,
        )
        session.add_all([org, owner])
        await session.commit()
        await session.refresh(org)
        await session.refresh(owner)

    token = create_access_token(owner.id, owner.email)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete(f"/api/platform/organizations/{org.id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"

    async with core_db.SessionLocal() as session:
        check = await session.get(Organization, org.id)
        assert check is None

        u = await session.get(User, owner.id)
        if u:
            await session.delete(u)
        await session.commit()


@pytest.mark.anyio
async def test_cannot_delete_central_organization_id_1():
    uid = uuid.uuid4().hex[:6]
    async with core_db.SessionLocal() as session:
        owner = User(
            email=f"owner_root_{uid}@saas.uz",
            full_name="Boss",
            hashed_password=hash_password("Pwd123!"),
            is_platform_owner=True,
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)

    token = create_access_token(owner.id, owner.email)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete("/api/platform/organizations/1", headers=headers)
        assert resp.status_code == 400
        assert "asosiy" in resp.json()["detail"].lower()

    async with core_db.SessionLocal() as session:
        u = await session.get(User, owner.id)
        if u:
            await session.delete(u)
        await session.commit()


@pytest.mark.anyio
async def test_regular_store_owner_cannot_access_platform_crud():
    uid = uuid.uuid4().hex[:6]
    async with core_db.SessionLocal() as session:
        org = Organization(name=f"Store Merchant {uid}", slug=f"merchant-store-{uid}")
        session.add(org)
        await session.flush()

        merchant = User(
            email=f"merchant_{uid}@market.uz",
            full_name="Merchant Guy",
            hashed_password=hash_password("Pwd123!"),
            is_platform_owner=False,  # NOT platform owner
        )
        session.add(merchant)
        await session.commit()
        await session.refresh(org)
        await session.refresh(merchant)

    token = create_access_token(merchant.id, merchant.email)
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Cannot list organizations
        r1 = await client.get("/api/platform/organizations", headers=headers)
        assert r1.status_code == 403

        # Cannot create organizations
        r2 = await client.post(
            "/api/platform/organizations",
            json={"name": "Hacked", "slug": "hacked", "owner_email": "hack@hack.uz"},
            headers=headers,
        )
        assert r2.status_code == 403

        # Cannot get metrics
        r3 = await client.get("/api/platform/metrics", headers=headers)
        assert r3.status_code == 403

    async with core_db.SessionLocal() as session:
        o = await session.get(Organization, org.id)
        u = await session.get(User, merchant.id)
        if o:
            await session.delete(o)
        if u:
            await session.delete(u)
        await session.commit()
