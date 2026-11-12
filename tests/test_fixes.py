"""Tests verifying core bugfixes and improvements: deduplication, chunking, usage limits, products."""

import pytest
import httpx
from datetime import datetime
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.dependencies.auth import create_access_token
from app.models import Organization, OrganizationMember, Product, User
from app.api.webhooks import is_duplicate_update
from app.services.knowledge import chunk_text
from app.services.usage_service import usage_service

# Use NullPool in tests to avoid asyncpg connection sharing across event loops
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


def test_webhook_deduplication_logic():
    """Verify update_id deduplication flags duplicates correctly."""
    up_id = 88991122
    assert is_duplicate_update(up_id) is False  # First time: allowed
    assert is_duplicate_update(up_id) is True   # Second time: detected duplicate
    assert is_duplicate_update(None) is False   # None is always allowed


def test_knowledge_chunk_text():
    """Verify long text is broken into semantic chunks with overlap."""
    short_text = "Noutbuk Asus TUF Gaming. Narxi: $340."
    assert chunk_text(short_text, max_chars=100) == [short_text]

    long_text = ("Noutbuk modeli: Asus ROG Strix G16. " * 30).strip()
    chunks = chunk_text(long_text, max_chars=200, overlap=30)
    assert len(chunks) > 1
    for ch in chunks:
        assert len(ch) <= 250


@pytest.mark.anyio
async def test_usage_service_check_limit_dict_contract():
    """Verify usage_service.check_limit returns a dict with 'allowed', 'used', 'limit'."""
    ts = int(datetime.now().timestamp() * 1000)
    async with core_db.SessionLocal() as db:
        org = Organization(name=f"Fixes Org {ts}", slug=f"fixes-org-{ts}")
        db.add(org)
        await db.commit()
        org_id = org.id

    async with core_db.SessionLocal() as db:
        result = await usage_service.check_limit(db, org_id, "ai_messages", increment=1)
        assert isinstance(result, dict)
        assert "allowed" in result
        assert "used" in result
        assert "limit" in result
        assert isinstance(result["allowed"], bool)

    # Cleanup
    async with core_db.SessionLocal() as db:
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.commit()


@pytest.mark.anyio
async def test_products_catalog_crud():
    """Verify /admin/products lists seeded products and creates/deletes a product."""
    ts = int(datetime.now().timestamp() * 1000)
    async with core_db.SessionLocal() as db:
        org = Organization(name=f"Prod Org {ts}", slug=f"prod-org-{ts}")
        user = User(email=f"prod_user_{ts}@test.com", full_name="Prod Admin", is_active=True)
        db.add_all([org, user])
        await db.flush()

        member = OrganizationMember(organization_id=org.id, user_id=user.id, role="owner", is_active=True)
        db.add(member)
        await db.commit()

        token = create_access_token(user.id, user.email)
        org_id = org.id
        user_id = user.id

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET products (seeds initial laptops if empty)
        resp = await client.get("/admin/products", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        prods = resp.json()
        assert len(prods) >= 1
        assert any("Asus TUF Gaming" in p["name"] for p in prods)

        # 2. POST create a new product
        new_prod = {
            "code": f"LAP-TEST-{ts % 1000}",
            "name": "Custom Test Laptop",
            "category": "Gaming",
            "specs": "Ryzen 9, 32GB RAM",
            "price": "$1200",
            "stock": "In Stock",
            "warranty": "1 yil",
        }
        resp = await client.post(
            "/admin/products",
            headers={"Authorization": f"Bearer {token}"},
            json=new_prod,
        )
        assert resp.status_code == 200
        created = resp.json()
        assert created["name"] == "Custom Test Laptop"
        created_code = created["id"]

        # 3. DELETE product
        resp = await client.delete(
            f"/admin/products/{created_code}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    # Cleanup
    async with core_db.SessionLocal() as db:
        await db.execute(delete(Product).where(Product.organization_id == org_id))
        await db.execute(delete(OrganizationMember).where(OrganizationMember.organization_id == org_id))
        await db.execute(delete(User).where(User.id == user_id))
        await db.execute(delete(Organization).where(Organization.id == org_id))
        await db.commit()
