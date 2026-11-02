"""Organization onboarding, configuration, and authentication endpoints."""

import hashlib
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.dependencies.auth import create_access_token, get_current_user
from app.models import Organization, OrganizationMember, User
from app.schemas import (
    OrganizationCreate,
    OrganizationOut,
    OrganizationUpdate,
    RegisterRequest,
    TokenRequest,
    TokenResponse,
)

router = APIRouter(prefix="/api/v1", tags=["onboarding"])


def _hash_password(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _org_to_out(org: Organization) -> dict:
    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "category": org.category,
        "status": org.status,
        "ai_language": org.ai_language,
        "ai_personality": org.ai_personality,
        "custom_system_prompt": org.custom_system_prompt,
        "telegram_bot_token_set": bool(org.telegram_bot_token),
        "openai_api_key_set": bool(org.openai_api_key),
        "gemini_api_key_set": bool(org.gemini_api_key),
        "created_at": org.created_at.isoformat() if org.created_at else None,
    }


# ---------------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------------

@router.post("/auth/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new platform user."""
    clean_email = payload.email.strip().lower()
    existing = await db.execute(select(User).where(User.email == clean_email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")

    user = User(
        email=clean_email,
        hashed_password=_hash_password(payload.password),
        full_name=payload.full_name.strip(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.post("/auth/login", response_model=TokenResponse)
async def login(payload: TokenRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email & password to receive a JWT access token."""
    clean_email = payload.email.strip().lower()
    result = await db.execute(select(User).where(User.email == clean_email))
    user = result.scalar_one_or_none()

    if user is None or user.hashed_password != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Foydalanuvchi faol emas")

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user_id=user.id, email=user.email)


@router.get("/auth/me")
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get profile of current logged-in user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "telegram_user_id": current_user.telegram_user_id,
        "is_platform_owner": current_user.is_platform_owner,
    }


# ---------------------------------------------------------------------------
# Organization CRUD & Credentials Management (JWT Protected)
# ---------------------------------------------------------------------------

@router.post("/organizations", response_model=OrganizationOut, status_code=201)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new organization. The creator automatically becomes the owner."""
    clean_slug = payload.slug.strip().lower()

    # Check slug uniqueness
    existing_slug = await db.execute(select(Organization).where(Organization.slug == clean_slug))
    if existing_slug.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Bu slug allaqachon band")

    # Check bot token uniqueness if provided
    token = payload.telegram_bot_token.strip() if payload.telegram_bot_token else None
    if token:
        existing_token = await db.execute(
            select(Organization).where(Organization.telegram_bot_token == token)
        )
        if existing_token.scalar_one_or_none() is not None:
            raise HTTPException(status_code=400, detail="Bu Telegram bot token boshqa tashkilotda ishlatilmoqda")

    org = Organization(
        name=payload.name.strip(),
        slug=clean_slug,
        category=payload.category,
        ai_language=payload.ai_language,
        ai_personality=payload.ai_personality,
        custom_system_prompt=payload.custom_system_prompt,
        telegram_bot_token=token,
        openai_api_key=payload.openai_api_key.strip() if payload.openai_api_key else None,
        gemini_api_key=payload.gemini_api_key.strip() if payload.gemini_api_key else None,
    )
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role="owner",
        permissions={},
    )
    db.add(member)
    await db.commit()
    await db.refresh(org)

    return _org_to_out(org)


@router.get("/organizations", response_model=list[OrganizationOut])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all organizations that current user belongs to."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id, OrganizationMember.is_active == True)
        .order_by(Organization.created_at.desc())
    )
    orgs = result.scalars().all()
    return [_org_to_out(org) for org in orgs]


@router.get("/organizations/{org_id}", response_model=OrganizationOut)
async def get_organization(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of an organization."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")

    # Verify membership
    member = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.is_active == True,
        )
    )
    if member.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu tashkilot a'zosi emassiz")

    return _org_to_out(org)


@router.patch("/organizations/{org_id}", response_model=OrganizationOut)
async def update_organization(
    org_id: int,
    payload: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update organization settings, bot token, or AI keys from dashboard."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")

    # Verify owner or admin permission
    member_res = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.role.in_(["owner", "admin"]),
            OrganizationMember.is_active == True,
        )
    )
    if member_res.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Faqat owner yoki admin tashkilot sozlamalarini o'zgartira oladi")

    # Check bot token uniqueness if being updated
    if payload.telegram_bot_token is not None:
        new_token = payload.telegram_bot_token.strip() or None
        if new_token:
            token_check = await db.execute(
                select(Organization).where(
                    Organization.telegram_bot_token == new_token,
                    Organization.id != org_id,
                )
            )
            if token_check.scalar_one_or_none() is not None:
                raise HTTPException(status_code=400, detail="Bu Telegram bot token boshqa tashkilotda ishlatilmoqda")
        org.telegram_bot_token = new_token

    if payload.name is not None:
        org.name = payload.name.strip()
    if payload.category is not None:
        org.category = payload.category
    if payload.ai_language is not None:
        org.ai_language = payload.ai_language
    if payload.ai_personality is not None:
        org.ai_personality = payload.ai_personality
    if payload.custom_system_prompt is not None:
        org.custom_system_prompt = payload.custom_system_prompt
    if payload.openai_api_key is not None:
        org.openai_api_key = payload.openai_api_key.strip() or None
    if payload.gemini_api_key is not None:
        org.gemini_api_key = payload.gemini_api_key.strip() or None

    await db.commit()
    await db.refresh(org)
    return _org_to_out(org)


@router.post("/organizations/{org_id}/verify-bot")
async def verify_organization_bot(
    org_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Test and verify the organization's Telegram bot token with Telegram getMe API."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Tashkilot topilmadi")

    # Verify membership
    member = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.is_active == True,
        )
    )
    if member.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="Siz bu tashkilot a'zosi emassiz")

    if not org.telegram_bot_token:
        raise HTTPException(status_code=400, detail="Tashkilotda Telegram bot token kiritilmagan")

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"https://api.telegram.org/bot{org.telegram_bot_token}/getMe")
            data = resp.json()
            if not data.get("ok"):
                return {
                    "valid": False,
                    "error": data.get("description", "Noto'g'ri bot token"),
                }
            bot_info = data.get("result", {})
            return {
                "valid": True,
                "bot_id": bot_info.get("id"),
                "bot_name": bot_info.get("first_name"),
                "bot_username": bot_info.get("username"),
            }
        except Exception as exc:
            return {"valid": False, "error": f"Telegram API bilan ulanishda xatolik: {exc}"}
