"""JWT-based and Master Token authentication dependencies for FastAPI."""

import hmac
from datetime import datetime, timedelta, timezone
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import jwt

from app.core.config import settings
from app.core.db import get_db
from app.core.permissions import ROLE_DEFAULTS
from app.models import Admin, OrganizationMember, User
from app.services import admin_service

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, email: str) -> str:
    """Create a signed JWT token for the given user."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises HTTPException on failure."""
    if not settings.jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET sozlanmagan — .env faylga qo'shing",
        )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token muddati tugagan")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Noto'g'ri token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT Bearer token."""
    payload = decode_access_token(credentials.credentials)
    user_id = int(payload["sub"])
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi yoki faol emas")
    return user


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    x_admin_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    """Authenticate admin identity strictly via cryptographic JWT token or verified Master Token.

    Security Rules:
    - X-Admin-Telegram-ID header impersonation is completely removed.
    - Missing or unverified credentials immediately return 401 Unauthorized.
    - Synthetic unpersisted owner creation is prohibited.
    """
    # 1. Bearer JWT Authentication (Standard cryptographically verified identity)
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            user_id = int(payload.get("sub", 0))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Yaroqsiz yoki muddati tugagan JWT token",
            )

        user = await db.get(User, user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Foydalanuvchi topilmadi yoki faol emas",
            )

        # Check if user matches an existing Admin row by Telegram User ID
        admin = None
        if user.telegram_user_id:
            admin = await admin_service.get_admin_by_telegram_id(db, user.telegram_user_id)

        # Platform owner fallback to owner admin
        if admin is None and user.is_platform_owner:
            if settings.admin_telegram_id:
                admin = await admin_service.get_admin_by_telegram_id(db, settings.admin_telegram_id)
            if admin is None:
                admin = await admin_service.ensure_owner(db)
                await db.commit()

        if admin is not None:
            admin._user = user
            admin._is_platform_owner = user.is_platform_owner
            return admin

        # If user is an active organization member with admin privileges
        member_res = await db.execute(
            select(OrganizationMember)
            .where(OrganizationMember.user_id == user.id, OrganizationMember.is_active.is_(True))
            .order_by(OrganizationMember.id.asc())
        )
        member = member_res.scalars().first()
        if member is not None:
            role = member.role
            perms = member.permissions or ROLE_DEFAULTS.get(role, {})
            admin_obj = Admin(
                id=user.id,
                organization_id=member.organization_id,
                telegram_user_id=user.telegram_user_id or 0,
                name=user.full_name or user.email,
                role=role,
                permissions=perms,
                is_active=True,
            )
            admin_obj._user = user
            admin_obj._is_platform_owner = user.is_platform_owner
            return admin_obj

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Foydalanuvchida admin yoki boshqaruv ruxsati mavjud emas",
        )

    # 2. Master token check (owner equivalent, for verified server-to-server operations)
    if settings.admin_api_token and x_admin_token and hmac.compare_digest(settings.admin_api_token, x_admin_token):
        owner = None
        if settings.admin_telegram_id:
            owner = await admin_service.get_admin_by_telegram_id(db, settings.admin_telegram_id)
            if owner is None:
                owner = await admin_service.ensure_owner(db)
                await db.commit()
        if owner is not None:
            owner._is_platform_owner = True
            return owner
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Master admin hisobi sozlanmagan",
        )

    # 3. Explicitly reject unauthenticated requests or impersonation attempts
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin avtorizatsiyadan o'tmagan",
    )
