"""Tenant context and organization isolation dependency."""

from fastapi import Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.dependencies.auth import get_current_admin
from app.models import Admin, Organization, OrganizationMember, User


async def get_admin_tenant_id(
    current_admin: Admin = Depends(get_current_admin),
    x_organization_id: str | None = Header(default=None),
    organization_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> int:
    """Resolve active tenant organization_id and strictly enforce tenant membership.

    Rules:
    1. If user supplies an explicit organization_id via header or query, they MUST
       be an active OrganizationMember of that organization, OR be a platform owner.
    2. An arbitrary X-Organization-Id is NEVER trusted without verified membership.
    3. Unauthorized attempts to access another organization are rejected with 403 Forbidden.
    4. If no organization_id is supplied, resolve to the admin's bound organization_id
       or the user's primary active organization membership.
    5. Never silently fallback to organization_id=1 for non-members.
    """
    target_id_raw = x_organization_id or (str(organization_id) if organization_id is not None else None)
    target_org_id: int | None = None
    if target_id_raw:
        try:
            target_org_id = int(target_id_raw.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Noto'g'ri tashkilot identifikatori (organization_id)",
            )

    # 1. Resolve underlying user if available
    user: User | None = None
    if current_admin.telegram_user_id:
        user_res = await db.execute(
            select(User).where(User.telegram_user_id == current_admin.telegram_user_id)
        )
        user = user_res.scalar_one_or_none()

    is_platform_owner = bool(
        (user and user.is_platform_owner)
        or (current_admin.role == "owner" and current_admin.organization_id in (None, 1))
    )

    # 2. Case: Specific target_org_id requested
    if target_org_id is not None:
        # Platform owner can target any existing organization
        if is_platform_owner:
            org = await db.get(Organization, target_org_id)
            if org is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tashkilot topilmadi")
            return target_org_id

        # Verify admin row itself is assigned to this organization
        if current_admin.organization_id == target_org_id:
            return target_org_id

        # Or verify user has an active membership in the requested organization
        if user is not None:
            mem_res = await db.execute(
                select(OrganizationMember).where(
                    OrganizationMember.user_id == user.id,
                    OrganizationMember.organization_id == target_org_id,
                    OrganizationMember.is_active.is_(True),
                )
            )
            if mem_res.scalar_one_or_none() is not None:
                return target_org_id

        # Forbidden: caller has no membership in requested organization
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Siz ushbu tashkilot a'zosi emassiz",
        )

    # 3. Case: No target_org_id requested -> resolve default bound organization
    if current_admin.organization_id:
        return current_admin.organization_id

    if user is not None:
        first_mem = (
            await db.execute(
                select(OrganizationMember.organization_id)
                .where(OrganizationMember.user_id == user.id, OrganizationMember.is_active.is_(True))
                .order_by(OrganizationMember.id.asc())
            )
        ).scalars().first()
        if first_mem is not None:
            return first_mem
        if is_platform_owner:
            return 1

    if current_admin.role == "owner":
        return 1

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Siz hech qaysi tashkilotga a'zo emassiz",
    )
