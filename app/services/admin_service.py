"""Admin CRUD and permission-checking service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import ALL_PERMISSIONS, ROLE_DEFAULTS, VALID_ROLES
from app.models import Admin

logger = get_logger(__name__)


async def ensure_owner(db: AsyncSession) -> Admin:
    """Make sure the owner row exists in the admins table.

    Called at startup and whenever the owner sends /start.  The owner
    is identified by ``ADMIN_TELEGRAM_ID`` in the environment.
    """
    owner_id = settings.admin_telegram_id
    if not owner_id:
        raise RuntimeError("ADMIN_TELEGRAM_ID sozlanmagan (.env da belgilang)")
    result = await db.execute(
        select(Admin).where(Admin.telegram_user_id == owner_id)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        admin = Admin(
            telegram_user_id=owner_id,
            name="Owner",
            role="owner",
            permissions=ROLE_DEFAULTS["owner"],
            is_active=True,
        )
        db.add(admin)
        await db.flush()
        logger.info("Owner admin yaratildi: telegram_user_id=%s", owner_id)
    else:
        # Always keep owner role and all permissions in sync.
        if admin.role != "owner":
            admin.role = "owner"
        admin.permissions = ROLE_DEFAULTS["owner"]
        admin.is_active = True
    return admin


async def get_admin_by_telegram_id(db: AsyncSession, telegram_user_id: int) -> Admin | None:
    """Return the admin row for a Telegram user, or None."""
    result = await db.execute(
        select(Admin).where(
            Admin.telegram_user_id == telegram_user_id,
            Admin.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


async def list_admins(db: AsyncSession) -> list[Admin]:
    """Return all admin rows (active and inactive)."""
    result = await db.execute(select(Admin).order_by(Admin.created_at.asc()))
    return list(result.scalars().all())


async def add_admin(
    db: AsyncSession,
    *,
    telegram_user_id: int,
    name: str = "",
    username: str | None = None,
    role: str = "moderator",
    added_by: int | None = None,
) -> Admin:
    """Add a new admin or reactivate an existing inactive one."""
    if role not in VALID_ROLES:
        raise ValueError(f"Noto'g'ri rol: {role}. Mumkin bo'lganlar: {VALID_ROLES}")
    if role == "owner":
        raise ValueError("Owner faqat .env orqali belgilanadi")

    result = await db.execute(
        select(Admin).where(Admin.telegram_user_id == telegram_user_id)
    )
    admin = result.scalar_one_or_none()
    if admin is not None:
        if admin.is_active:
            raise ValueError(f"Bu foydalanuvchi allaqachon admin: {admin.name} ({admin.role})")
        # Reactivate.
        admin.is_active = True
        admin.role = role
        admin.permissions = ROLE_DEFAULTS.get(role, ROLE_DEFAULTS["moderator"])
        admin.name = name or admin.name
        admin.username = username or admin.username
        admin.added_by = added_by
        logger.info("Admin qayta faollashtirildi: user_id=%s, role=%s", telegram_user_id, role)
    else:
        admin = Admin(
            telegram_user_id=telegram_user_id,
            name=name,
            username=username,
            role=role,
            permissions=ROLE_DEFAULTS.get(role, ROLE_DEFAULTS["moderator"]),
            is_active=True,
            added_by=added_by,
        )
        db.add(admin)
        logger.info("Yangi admin qo'shildi: user_id=%s, role=%s, by=%s", telegram_user_id, role, added_by)
    await db.flush()
    return admin


async def remove_admin(db: AsyncSession, telegram_user_id: int) -> Admin:
    """Deactivate an admin (soft delete).  Cannot remove the owner."""
    result = await db.execute(
        select(Admin).where(Admin.telegram_user_id == telegram_user_id)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise ValueError("Admin topilmadi")
    if admin.role == "owner":
        raise ValueError("Owner adminni o'chirib bo'lmaydi")
    admin.is_active = False
    logger.info("Admin o'chirildi (deactivated): user_id=%s", telegram_user_id)
    await db.flush()
    return admin


async def update_permission(
    db: AsyncSession,
    telegram_user_id: int,
    permission: str,
    value: bool,
) -> Admin:
    """Toggle a single permission for an admin."""
    if permission not in ALL_PERMISSIONS:
        raise ValueError(f"Noto'g'ri ruxsat nomi: {permission}")
    result = await db.execute(
        select(Admin).where(Admin.telegram_user_id == telegram_user_id)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise ValueError("Admin topilmadi")
    if admin.role == "owner":
        raise ValueError("Owner ruxsatlarini o'zgartirib bo'lmaydi")
    perms = dict(admin.permissions)
    perms[permission] = value
    admin.permissions = perms
    logger.info(
        "Admin ruxsat yangilandi: user_id=%s, %s=%s",
        telegram_user_id, permission, value,
    )
    await db.flush()
    return admin


async def update_role(db: AsyncSession, telegram_user_id: int, new_role: str) -> Admin:
    """Change an admin's role and reset permissions to role defaults."""
    if new_role not in VALID_ROLES:
        raise ValueError(f"Noto'g'ri rol: {new_role}")
    if new_role == "owner":
        raise ValueError("Owner rolini boshqa adminga berib bo'lmaydi")
    result = await db.execute(
        select(Admin).where(Admin.telegram_user_id == telegram_user_id)
    )
    admin = result.scalar_one_or_none()
    if admin is None:
        raise ValueError("Admin topilmadi")
    if admin.role == "owner":
        raise ValueError("Owner rolini o'zgartirib bo'lmaydi")
    admin.role = new_role
    admin.permissions = ROLE_DEFAULTS.get(new_role, ROLE_DEFAULTS["moderator"])
    logger.info("Admin roli yangilandi: user_id=%s, new_role=%s", telegram_user_id, new_role)
    await db.flush()
    return admin


def has_permission(admin: Admin | None, permission: str) -> bool:
    """Check whether an admin has a specific permission."""
    if admin is None or not admin.is_active:
        return False
    if admin.role == "owner":
        return True
    return bool(admin.permissions.get(permission, False))
