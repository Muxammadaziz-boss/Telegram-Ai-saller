from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    app_name: str = "AI Sales Assistant"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = "postgresql+asyncpg://sales:sales_local_dev_password@localhost:5432/aisales"
    redis_url: str = "redis://localhost:6379/0"

    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    telegram_public_channel: str = ""
    telegram_admin_chat_id: str = ""

    openai_api_key: str = ""
    openai_base_url: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dim: int = 1536

    # Google Gemini API
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"
    gemini_embedding_model: str = "gemini-embedding-001"
    ai_provider: str = "auto"  # "gemini", "openai", or "auto"

    admin_api_token: str = ""
    internal_ingest_token: str = ""
    admin_telegram_id: int = 0  # Owner Telegram user ID — set in .env

    telegram_api_id: int | None = None
    telegram_api_hash: str = ""
    telegram_phone: str = ""

    storage_dir: str = "./storage"
    allowed_origins: str = "http://localhost:3000"  # Comma-separated for multiple


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
