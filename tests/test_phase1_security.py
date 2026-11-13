"""Tests for Bosqich 1: Security Foundation and Hardened Multi-Tenancy."""

import os
import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import app.core.db as core_db
from app.core.config import settings
from app.core.security import (
    decrypt_secret,
    encrypt_secret,
    hash_password,
    is_rate_limited,
    mask_secret,
    record_attempt,
    reset_rate_limit,
    verify_password,
)
from app.dependencies.auth import create_access_token
from app.models import Admin, Base, Organization, OrganizationMember, User

# Use NullPool in tests to avoid asyncpg connection sharing across separate event loops
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
core_db.engine = test_engine
core_db.SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

from app.main import app


# ===========================================================================
# 1. Bcrypt Password Hashing & Legacy Compatibility
# ===========================================================================

def test_bcrypt_password_hashing():
    raw = "SuperSecretPassword123!"
    hashed = hash_password(raw)
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_legacy_sha256_backward_compatibility():
    import hashlib
    raw = "LegacyPassword2026"
    legacy_sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    assert verify_password(raw, legacy_sha) is True
    assert verify_password("WrongPass", legacy_sha) is False


# ===========================================================================
# 2. Fernet Secret Encryption and Masking
# ===========================================================================

def test_fernet_secret_encryption_and_masking():
    raw_token = "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
    encrypted = encrypt_secret(raw_token)
    assert encrypted != raw_token
    assert encrypted.startswith("gAAAAA")
    assert decrypt_secret(encrypted) == raw_token
    assert mask_secret(encrypted) == "1234...wxYZ"


@pytest.mark.anyio
async def test_organization_secrets_stored_encrypted():
    raw_token = "9876543210:TestBotTokenSecretForOrgABC"
    raw_key = "sk-antigravity-test-key-openai-12345"

    async with core_db.SessionLocal() as session:
        org = Organization(
            name="Encrypted Secrets Org",
            slug=f"encrypted-secrets-org-test-{int(os.getpid())}",
            telegram_bot_token=encrypt_secret(raw_token),
            openai_api_key=encrypt_secret(raw_key),
        )
        session.add(org)
        await session.flush()

        assert org.telegram_bot_token.startswith("gAAAAA")
        assert org.decrypted_bot_token == raw_token
        assert org.openai_api_key.startswith("gAAAAA")
        assert org.decrypted_openai_api_key == raw_key
        await session.rollback()


# ===========================================================================
# 3. Platform Owner RBAC Security (Tenant owner vs Platform owner)
# ===========================================================================

@pytest.mark.anyio
async def test_require_platform_owner_rejects_tenant_owner():
    async with core_db.SessionLocal() as session:
        # Create tenant org
        org = Organization(name="Store A", slug=f"store-a-rbac-test-{int(os.getpid())}")
        session.add(org)
        await session.flush()

        # Create user who is merely a tenant owner (not platform owner)
        tenant_owner_user = User(
            email=f"tenant_owner_{int(os.getpid())}@test.com",
            full_name="Tenant Owner",
            hashed_password=hash_password("password123"),
            is_platform_owner=False,
        )
        session.add(tenant_owner_user)
        await session.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=tenant_owner_user.id,
            role="owner",  # Local tenant owner role
            permissions={"can_view_conversations": True},
        )
        session.add(member)
        await session.commit()

        token = create_access_token(tenant_owner_user.id, tenant_owner_user.email)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": str(org.id),
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/platform/metrics", headers=headers)
            assert resp.status_code == 403
            assert "Faqat Platforma egasi" in resp.json()["detail"]


@pytest.mark.anyio
async def test_require_platform_owner_allows_true_platform_owner():
    async with core_db.SessionLocal() as session:
        platform_owner_user = User(
            email=f"super_owner_{int(os.getpid())}@platform.com",
            full_name="Platform Chief",
            hashed_password=hash_password("password123"),
            is_platform_owner=True,
        )
        session.add(platform_owner_user)
        await session.commit()

        token = create_access_token(platform_owner_user.id, platform_owner_user.email)
        headers = {"Authorization": f"Bearer {token}"}

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/platform/metrics", headers=headers)
            assert resp.status_code == 200


# ===========================================================================
# 4. SaaS Granular Permissions (can_manage_billing, can_manage_settings)
# ===========================================================================

@pytest.mark.anyio
async def test_saas_billing_permission_enforced():
    async with core_db.SessionLocal() as session:
        org = Organization(name="Billing Test Org", slug=f"billing-test-org-{int(os.getpid())}")
        session.add(org)
        await session.flush()

        operator_user = User(
            email=f"operator_billing_{int(os.getpid())}@test.com",
            full_name="Operator User",
            hashed_password=hash_password("password123"),
            is_platform_owner=False,
        )
        session.add(operator_user)
        await session.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=operator_user.id,
            role="operator",
            permissions={"can_manage_billing": False},
        )
        session.add(member)
        await session.commit()

        token = create_access_token(operator_user.id, operator_user.email)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": str(org.id),
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/subscription/upgrade",
                json={"new_plan_code": "pro", "billing_cycle": "monthly"},
                headers=headers,
            )
            assert resp.status_code == 403
            assert "can_manage_billing" in resp.json()["detail"]


# ===========================================================================
# 5. Organization-Specific Webhook Secret
# ===========================================================================

@pytest.mark.anyio
async def test_organization_specific_webhook_secret():
    org_secret = "secret_for_org_custom_webhook_12345"
    async with core_db.SessionLocal() as session:
        org = Organization(
            name="Webhook Org",
            slug=f"webhook-org-test-{int(os.getpid())}",
            webhook_secret=org_secret,
        )
        session.add(org)
        await session.commit()

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Valid org secret accepted
            resp = await client.post(
                f"/telegram/webhook/{org.slug}",
                json={"update_id": 999901, "message": {}},
                headers={"X-Telegram-Bot-Api-Secret-Token": org_secret},
            )
            assert resp.status_code == 200

            # 2. Invalid secret rejected
            resp_invalid = await client.post(
                f"/telegram/webhook/{org.slug}",
                json={"update_id": 999902, "message": {}},
                headers={"X-Telegram-Bot-Api-Secret-Token": "wrong_secret"},
            )
            assert resp_invalid.status_code == 401


# ===========================================================================
# 6. Rate Limiting Tracker
# ===========================================================================

def test_rate_limiting_tracker():
    key = "test_rate_limit_user"
    reset_rate_limit(key)
    for _ in range(5):
        record_attempt(key)
    assert is_rate_limited(key, max_attempts=5, window_seconds=60) is True
    reset_rate_limit(key)
    assert is_rate_limited(key, max_attempts=5, window_seconds=60) is False


# ===========================================================================
# 7. Zero Hardcoded Telegram IDs in App Code
# ===========================================================================

def test_no_hardcoded_telegram_id_in_source():
    repo_root = os.path.dirname(os.path.dirname(__file__))
    forbidden = "6990611858"

    for folder in ["app", "web"]:
        dir_path = os.path.join(repo_root, folder)
        for root, dirs, files in os.walk(dir_path):
            if "node_modules" in root or ".next" in root or "__pycache__" in root:
                continue
            for file in files:
                if file.endswith((".py", ".ts", ".tsx", ".js")):
                    path = os.path.join(root, file)
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        assert forbidden not in content, f"Hardcoded {forbidden} found in {path}"
