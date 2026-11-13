import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.api.admin import router as admin_router
from app.api.internal import router as internal_router
from app.api.onboarding import router as onboarding_router
from app.api.platform import router as platform_router
from app.api.saas import router as saas_router
from app.api.webhooks import router as webhook_router
from app.core.config import settings
from app.core.db import SessionLocal, engine
from app.core.logging import get_logger, setup_logging
from app.models import Base
from app.services import admin_service
from app.services.telegram import telegram

logger = get_logger(__name__)


async def _subscription_maintenance_loop():
    """Background task checking and expiring overdue trials periodically."""
    while True:
        try:
            await asyncio.sleep(1800)  # Check every 30 minutes
            async with SessionLocal() as db:
                from datetime import datetime, timezone
                from sqlalchemy import update
                from app.models import Subscription

                now = datetime.now(timezone.utc)
                stmt = (
                    update(Subscription)
                    .where(
                        Subscription.status == "trialing",
                        Subscription.trial_end_at.is_not(None),
                        Subscription.trial_end_at < now,
                    )
                    .values(status="trial_expired")
                )
                res = await db.execute(stmt)
                if res.rowcount and res.rowcount > 0:
                    await db.commit()
                    logger.info("Muddati tugagan %s ta sinov obunasi 'trial_expired' holatiga o'tkazildi", res.rowcount)
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Obunalarni tekshirish fon vazifasida xatolik")


@asynccontextmanager
async def lifespan(application: FastAPI):
    setup_logging()
    logger.info("Starting %s (%s)", settings.app_name, settings.app_env)
    storage_path = Path(settings.storage_dir)
    storage_path.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        # Ensure multi-tenant organization_id columns exist on legacy tables
        try:
            await conn.execute(text("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(64)"))
            await conn.execute(text("ALTER TABLE organizations ALTER COLUMN telegram_bot_token TYPE TEXT"))
            await conn.execute(text("ALTER TABLE organizations ALTER COLUMN openai_api_key TYPE TEXT"))
            await conn.execute(text("ALTER TABLE organizations ALTER COLUMN gemini_api_key TYPE TEXT"))
        except Exception as e:
            logger.warning("Organizations column migration: %s", e)

        legacy_tables = [
            "conversations",
            "messages",
            "channel_posts",
            "connected_channels",
            "orders",
            "business_connections",
            "system_settings",
            "admins",
            "products",
            "customers",
        ]
        for tbl in legacy_tables:
            try:
                await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE"))
            except Exception as e:
                logger.warning("Table %s column migration: %s", tbl, e)

        # Synchronize serial primary key sequences to avoid duplicate key errors
        for tbl in ["organizations", "users", "organization_members", "plans", "subscriptions"]:
            try:
                await conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 0) + 1, false)"))
            except Exception:
                pass

    # Mount static files after storage directory is guaranteed to exist.
    application.mount("/storage", StaticFiles(directory=storage_path), name="storage")

    # Initialize SaaS Plans, Defaults, and Default Organization
    try:
        async with SessionLocal() as db:
            from app.services import saas_service
            await saas_service.seed_plans_and_defaults(db)
            logger.info("SaaS tariflar va birlamchi tashkilot sinxronlandi")
    except Exception:
        logger.exception("SaaS rejalari va tashkilotni yuklashda xatolik yuz berdi")

    # Ensure owner exists if ADMIN_TELEGRAM_ID is configured
    if settings.admin_telegram_id:
        try:
            async with SessionLocal() as db:
                await admin_service.ensure_owner(db)
                await db.commit()
                logger.info("Owner admin tekshirildi/yaratildi: %s", settings.admin_telegram_id)
        except Exception:
            logger.exception("Owner admin tekshirishda xatolik yuz berdi")

    # Register bot commands in Telegram menu
    if settings.telegram_bot_token and telegram is not None:
        try:
            bot_commands = [
                {"command": "admin", "description": "Admin boshqaruv paneli"},
                {"command": "help", "description": "Barcha buyruqlar va yordam"},
                {"command": "channels", "description": "Ulangan Telegram kanallari"},
                {"command": "sync", "description": "Kanallarni sinxronlash"},
                {"command": "admins", "description": "Adminlar ro'yxati"},
                {"command": "mypermissions", "description": "Mening ruxsatlarim"},
            ]
            await telegram.call("setMyCommands", {"commands": bot_commands})
            logger.info("Telegram bot menyu buyruqlari o'rnatildi (setMyCommands)")
        except Exception:
            logger.exception("setMyCommands o'rnatishda xatolik yuz berdi")

    maintenance_task = asyncio.create_task(_subscription_maintenance_loop())
    logger.info("Application ready")
    yield
    maintenance_task.cancel()
    try:
        await maintenance_task
    except asyncio.CancelledError:
        pass
    await engine.dispose()
    logger.info("Application shut down")


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

cors_origins = [orig.strip() for orig in settings.allowed_origins.split(",") if orig.strip()]
if not cors_origins:
    cors_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(webhook_router)
app.include_router(onboarding_router)
app.include_router(admin_router)
app.include_router(internal_router)
app.include_router(saas_router)
app.include_router(platform_router)



@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.app_env}
