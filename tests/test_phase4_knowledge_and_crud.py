"""Tests for Bosqich 4 & 5: Knowledge Base, Channel Sync, Product Auto-Extraction,
and Scoped Products/Orders/Customers CRUD with strict Tenant Isolation.
"""

import os
import random
import uuid
from datetime import datetime, timezone
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.core.security import hash_password
from app.dependencies.auth import create_access_token
from app.models import ChannelPost, ConnectedChannel, Customer, Order, Organization, OrganizationMember, Product, User
from app.services.knowledge import parse_product_from_text, knowledge

test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


# ===========================================================================
# 1. Product Text Parser Unit Test
# ===========================================================================

def test_parse_product_from_text():
    sample_text = (
        "🔥 Apple iPhone 15 Pro Max 256GB Natural Titanium\n"
        "Xarakteristika: A17 Pro / 8GB RAM / 256GB / Super Retina XDR 120Hz\n"
        "Holati: Yangi, qutida (ochilmagan)\n"
        "Narxi: 1 150$\n"
        "Kafolat: 1 yil rasmiy Apple kafolati"
    )
    parsed = parse_product_from_text(sample_text, default_category="Smartphones")
    assert parsed is not None
    assert "iPhone 15 Pro Max" in parsed["name"]
    assert "1 150$" in parsed["price"]
    assert "1 yil" in parsed["warranty"]
    assert "A17 Pro" in parsed["specs"]


# ===========================================================================
# 2. Knowledge Base Isolation & Scoped Listing
# ===========================================================================

@pytest.mark.anyio
async def test_knowledge_posts_tenant_isolation():
    rand_suffix = f"{os.getpid()}_{uuid.uuid4().hex[:6]}"
    async with core_db.SessionLocal() as session:
        # Org A
        org_a = Organization(name="Shop Alpha", slug=f"shop-alpha-{rand_suffix}")
        session.add(org_a)
        user_a = User(email=f"alpha_user_{rand_suffix}@ai-sales.uz", full_name="Alpha User", hashed_password=hash_password("Pass123!"))
        session.add(user_a)

        # Org B
        org_b = Organization(name="Shop Beta", slug=f"shop-beta-{rand_suffix}")
        session.add(org_b)
        user_b = User(email=f"beta_user_{rand_suffix}@ai-sales.uz", full_name="Beta User", hashed_password=hash_password("Pass123!"))
        session.add(user_b)

        await session.commit()
        await session.refresh(org_a)
        await session.refresh(user_a)
        await session.refresh(org_b)
        await session.refresh(user_b)

        # Memberships
        session.add(OrganizationMember(organization_id=org_a.id, user_id=user_a.id, role="owner"))
        session.add(OrganizationMember(organization_id=org_b.id, user_id=user_b.id, role="owner"))

        msg_id_a = random.randint(100000, 900000)
        msg_id_b = msg_id_a + 1

        # Posts for Org A
        post_a = ChannelPost(
            organization_id=org_a.id,
            channel_username=f"alpha_chan_{rand_suffix}",
            telegram_message_id=msg_id_a,
            text="Alpha Mahsulot 1: Parfyum Chanel 100ml. Narxi: $120",
        )
        session.add(post_a)

        # Posts for Org B
        post_b = ChannelPost(
            organization_id=org_b.id,
            channel_username=f"beta_chan_{rand_suffix}",
            telegram_message_id=msg_id_b,
            text="Beta Mahsulot 2: Sport krossovka Nike. Narxi: $85",
        )
        session.add(post_b)
        await session.commit()

        # Token A
        token_a = create_access_token(user_a.id, user_a.email)
        headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": str(org_a.id)}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res_a = await client.get("/admin/knowledge", headers=headers_a)
            assert res_a.status_code == 200
            posts = res_a.json()
            # Org A must see its post and MUST NOT see Org B's post
            assert any(p["telegram_message_id"] == msg_id_a for p in posts)
            assert not any(p["telegram_message_id"] == msg_id_b for p in posts)


# ===========================================================================
# 3. Product Auto-Extraction from Channel Posts
# ===========================================================================

@pytest.mark.anyio
async def test_extract_products_from_channel_posts_endpoint():
    rand_suffix = f"{os.getpid()}_{uuid.uuid4().hex[:6]}"
    async with core_db.SessionLocal() as session:
        org = Organization(name="Electronics Hub", slug=f"electro-hub-{rand_suffix}")
        session.add(org)
        user = User(email=f"electro_{rand_suffix}@ai-sales.uz", full_name="Electro Boss", hashed_password=hash_password("Pass123!"))
        session.add(user)
        await session.commit()
        await session.refresh(org)
        await session.refresh(user)

        session.add(OrganizationMember(organization_id=org.id, user_id=user.id, role="owner"))

        msg_id = random.randint(100000, 900000)
        # Insert channel post with clear product data
        post = ChannelPost(
            organization_id=org.id,
            channel_username=f"electro_{rand_suffix}",
            telegram_message_id=msg_id,
            text=(
                "Sony PlayStation 5 Slim 1TB\n"
                "Protsessor: AMD Zen 2 / 16GB GDDR6 / 1TB SSD\n"
                "Komplekt: 1 dona DualSense pult\n"
                "Narxi: $520\n"
                "Kafolat: 6 oy kafolat"
            ),
        )
        session.add(post)
        await session.commit()

        token = create_access_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}", "X-Organization-Id": str(org.id)}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/admin/products/extract-from-posts", headers=headers)
            assert res.status_code == 200
            data = res.json()
            assert data["ok"] is True
            assert data["extracted_count"] >= 1
            extracted = data["products"][0]
            assert "PlayStation 5" in extracted["name"]
            assert "$520" in extracted["price"]

        # Verify product exists in database for this organization
        prod_db = (await session.execute(
            select(Product).where(Product.organization_id == org.id, Product.code == f"PRD-{msg_id}")
        )).scalar_one_or_none()
        assert prod_db is not None
        assert "$520" in prod_db.price


# ===========================================================================
# 4. Products CRUD & Isolation
# ===========================================================================

@pytest.mark.anyio
async def test_products_crud_and_isolation():
    rand_suffix = f"{os.getpid()}_{uuid.uuid4().hex[:6]}"
    async with core_db.SessionLocal() as session:
        org_a = Organization(name="Auto Parts", slug=f"auto-parts-{rand_suffix}")
        session.add(org_a)
        user_a = User(email=f"auto_{rand_suffix}@ai-sales.uz", full_name="Auto User", hashed_password=hash_password("Pass123!"))
        session.add(user_a)

        org_b = Organization(name="Cosmetics Store", slug=f"cosmetics-{rand_suffix}")
        session.add(org_b)
        user_b = User(email=f"cosm_{rand_suffix}@ai-sales.uz", full_name="Cosm User", hashed_password=hash_password("Pass123!"))
        session.add(user_b)

        await session.commit()
        await session.refresh(org_a)
        await session.refresh(user_a)
        await session.refresh(org_b)
        await session.refresh(user_b)

        session.add(OrganizationMember(organization_id=org_a.id, user_id=user_a.id, role="owner"))
        session.add(OrganizationMember(organization_id=org_b.id, user_id=user_b.id, role="owner"))
        await session.commit()

        token_a = create_access_token(user_a.id, user_a.email)
        headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": str(org_a.id)}

        token_b = create_access_token(user_b.id, user_b.email)
        headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": str(org_b.id)}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Create Product in Org A
            create_res = await client.post(
                "/admin/products",
                json={
                    "name": "Brembo Tormoz Kalodkalari",
                    "category": "Tormoz Tizimi",
                    "specs": "Ceramic / Old g'ildiraklar uchun",
                    "price": "$45",
                    "stock": "In Stock",
                    "warranty": "1 oy",
                },
                headers=headers_a,
            )
            assert create_res.status_code == 200
            created_prod = create_res.json()
            prod_code = created_prod["id"]

            # 2. Update Product in Org A
            update_res = await client.put(
                f"/admin/products/{prod_code}",
                json={"price": "$40", "stock": "Low Stock"},
                headers=headers_a,
            )
            assert update_res.status_code == 200
            updated = update_res.json()
            assert updated["price"] == "$40"
            assert updated["stock"] == "Low Stock"

            # 3. Org B attempts to update Org A's product -> Rejected (404)
            idor_update = await client.put(
                f"/admin/products/{prod_code}",
                json={"price": "$1"},
                headers=headers_b,
            )
            assert idor_update.status_code == 404

            # 4. Org B attempts to delete Org A's product -> Rejected (404)
            idor_delete = await client.delete(
                f"/admin/products/{prod_code}",
                headers=headers_b,
            )
            assert idor_delete.status_code == 404

            # 5. Org A deletes its product
            del_res = await client.delete(
                f"/admin/products/{prod_code}",
                headers=headers_a,
            )
            assert del_res.status_code == 200


# ===========================================================================
# 5. Orders CRUD & Isolation
# ===========================================================================

@pytest.mark.anyio
async def test_orders_crud_and_isolation():
    rand_suffix = f"{os.getpid()}_{uuid.uuid4().hex[:6]}"
    async with core_db.SessionLocal() as session:
        org_a = Organization(name="Boutique A", slug=f"boutique-a-{rand_suffix}")
        session.add(org_a)
        user_a = User(email=f"boutique_a_{rand_suffix}@ai-sales.uz", full_name="Boutique Owner", hashed_password=hash_password("Pass123!"))
        session.add(user_a)

        org_b = Organization(name="Boutique B", slug=f"boutique-b-{rand_suffix}")
        session.add(org_b)
        user_b = User(email=f"boutique_b_{rand_suffix}@ai-sales.uz", full_name="Boutique Rival", hashed_password=hash_password("Pass123!"))
        session.add(user_b)

        await session.commit()
        await session.refresh(org_a)
        await session.refresh(user_a)
        await session.refresh(org_b)
        await session.refresh(user_b)

        session.add(OrganizationMember(organization_id=org_a.id, user_id=user_a.id, role="owner"))
        session.add(OrganizationMember(organization_id=org_b.id, user_id=user_b.id, role="owner"))
        await session.commit()

        token_a = create_access_token(user_a.id, user_a.email)
        headers_a = {"Authorization": f"Bearer {token_a}", "X-Organization-Id": str(org_a.id)}

        token_b = create_access_token(user_b.id, user_b.email)
        headers_b = {"Authorization": f"Bearer {token_b}", "X-Organization-Id": str(org_b.id)}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Create Order in Org A
            create_res = await client.post(
                "/admin/orders",
                json={
                    "customer_name": "Jamshid Nosirov",
                    "phone": "+998901234567",
                    "product_summary": "Qishki Kurtka L razmer",
                    "delivery_address": "Toshkent sh., Chilonzor 9",
                    "amount": "$110",
                    "status": "new",
                },
                headers=headers_a,
            )
            assert create_res.status_code == 200
            order_data = create_res.json()["order"]
            order_id = order_data["db_id"]

            # 2. Update status in Org A
            patch_res = await client.patch(
                f"/admin/orders/{order_id}",
                json={"status": "Confirmed"},
                headers=headers_a,
            )
            assert patch_res.status_code == 200
            assert patch_res.json()["order"]["status"] == "Confirmed"

            # 3. Org B attempts to patch Org A's order -> 404
            idor_patch = await client.patch(
                f"/admin/orders/{order_id}",
                json={"status": "Cancelled"},
                headers=headers_b,
            )
            assert idor_patch.status_code == 404

            # 4. Org B attempts to delete Org A's order -> 404
            idor_del = await client.delete(
                f"/admin/orders/{order_id}",
                headers=headers_b,
            )
            assert idor_del.status_code == 404

            # 5. Org A deletes its own order -> 200
            del_res = await client.delete(
                f"/admin/orders/{order_id}",
                headers=headers_a,
            )
            assert del_res.status_code == 200
