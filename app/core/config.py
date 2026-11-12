from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

KNOWN_INSECURE_SECRETS = {
    "",
    "secret",
    "changeme",
    "super_secret_jwt_key_change_in_production_2026",
    "super_secret_admin_token_2026_xyz",
    "internal_ingest_token_secret_2026_abc",
    "webhook_secret_2026_abc123",
    "tg_secret_webhook_token_2026_xyz",
    "session_signing_secret_key_random_2026_abc",
}


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
    public_webhook_url: str = ""

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

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in ("production", "prod")

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        if self.is_production:
            # 1. JWT Secret
            if not self.jwt_secret or len(self.jwt_secret) < 32 or self.jwt_secret in KNOWN_INSECURE_SECRETS:
                raise ValueError(
                    "Production security failure: JWT_SECRET must be configured with a strong, "
                    "non-default secret at least 32 characters long."
                )

            # 2. Telegram Webhook Secret
            if (
                not self.telegram_webhook_secret
                or len(self.telegram_webhook_secret) < 16
                or self.telegram_webhook_secret in KNOWN_INSECURE_SECRETS
            ):
                raise ValueError(
                    "Production security failure: TELEGRAM_WEBHOOK_SECRET must be configured with a strong, "
                    "non-default secret at least 16 characters long."
                )

            # 3. Admin API Token
            if (
                not self.admin_api_token
                or len(self.admin_api_token) < 16
                or self.admin_api_token in KNOWN_INSECURE_SECRETS
            ):
                raise ValueError(
                    "Production security failure: ADMIN_API_TOKEN must be configured with a strong, "
                    "non-default secret at least 16 characters long."
                )

            # 4. Database URL
            if "sales_local_dev_password" in self.database_url:
                raise ValueError(
                    "Production security failure: DATABASE_URL contains default development credentials."
                )
        else:
            # Development convenience fallback
            if not self.jwt_secret:
                self.jwt_secret = "dev_insecure_jwt_secret_key_only_for_local_testing_32chars_long"

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
