"""Application configuration — loaded from environment / .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "Eduly API"
    DEBUG: bool = False

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:postgres123@localhost:5432/eduly"

    # ── JWT ───────────────────────────────────────────────────
    SECRET_KEY: str  # No default — app crashes if not set
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ── CORS ──────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── Misc / scheduler ──────────────────────────────────────
    EDULY_TZ: str = "Asia/Tashkent"
    REDIS_URL: str = ""

    # extra="ignore" so the .env file can include keys consumed by other
    # processes (cron jobs, scheduler, third-party libs) without crashing.
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
