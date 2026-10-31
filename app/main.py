from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.api.admin import router as admin_router
from app.api.internal import router as internal_router
from app.api.webhooks import router as webhook_router
from app.core.config import settings
from app.core.db import SessionLocal, engine
from app.core.logging import get_logger, setup_logging
from app.models import Base
from app.services import admin_service
from app.services.telegram import telegram

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    setup_logging()
    logger.info("Starting %s (%s)", settings.app_name, settings.app_env)
    storage_path = Path(settings.storage_dir)
    storage_path.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    # Mount static files after storage directory is guaranteed to exist.
    application.mount("/storage", StaticFiles(directory=storage_path), name="storage")

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
    if settings.telegram_bot_token:
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

    logger.info("Application ready")
    yield
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
app.include_router(admin_router)
app.include_router(internal_router)



@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.app_env}
