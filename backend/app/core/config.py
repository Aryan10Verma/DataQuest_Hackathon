"""Application settings, loaded from environment variables / .env."""

from datetime import date
from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

APP_VERSION = "0.1.0"
ENGINE_VERSION = "prism-engine/1.0.0"
API_VERSION = "v1"


# Secrets shipped in examples and defaults; never acceptable outside development.
_PLACEHOLDER_SECRETS = {
    "dev-only-secret-change-me-0123456789abcdef",
    "change-me-in-production-at-least-32-chars",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "dev"
    mock_mode: bool = True
    database_url: str = "sqlite:///./prism.db"
    jwt_secret: str = "dev-only-secret-change-me-0123456789abcdef"
    access_token_ttl_min: int = 30
    refresh_token_ttl_days: int = 14
    # NoDecode: read the comma-separated .env value as-is (split below) instead of parsing it as JSON.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"]
    )
    rate_limit_per_minute: int = 120
    # Sign-in, sign-up and token refresh get their own, much tighter per-IP budget.
    auth_rate_limit_per_minute: int = 10
    # Requests with a larger body are refused before they are read.
    max_body_bytes: int = Field(default=1_000_000, ge=1_000)
    # Redirect http to https and send HSTS. Unset = on when APP_ENV=production. Behind a proxy that ends
    # TLS, run uvicorn with --proxy-headers so the original scheme is seen.
    force_https: bool | None = None
    # The refresh token travels in an HttpOnly cookie. Browsers accept Secure cookies on localhost;
    # set false only to test over plain http on another host.
    cookie_secure: bool = True
    # Fernet key that encrypts phone numbers and free-text notes at rest
    # (python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())").
    # Unset in development = a fixed development key; required in production.
    data_encryption_key: str | None = None
    ml_model_path: str | None = None
    ml_alpha: float = Field(default=0.5, ge=0.0, le=1.0)
    # Optional live job-postings feed (free key from developer.adzuna.com). Absent = feed disabled.
    adzuna_app_id: str | None = None
    adzuna_app_key: str | None = None
    adzuna_daily_budget: int = Field(default=200, ge=1, le=250)
    # Optional language model that rephrases run summaries and translates them (Tamil, Hindi). It never scores.
    # Any OpenAI-compatible chat endpoint works; defaults point at xAI Grok. Absent key = fixed templates.
    grok_api_key: str | None = None
    grok_base_url: str = "https://api.x.ai/v1"
    grok_model: str = "grok-4"
    grok_timeout_sec: float = Field(default=12.0, gt=0, le=60)
    # Deadline reminders: "console" logs messages (demo); "twilio" sends SMS / WhatsApp through Twilio.
    reminder_provider: str = Field(default="console", pattern="^(console|twilio)$")
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_from_sms: str | None = None
    twilio_from_whatsapp: str | None = None
    log_level: str = "INFO"
    # Built website (frontend/dist) to serve next to the API, so one server runs the whole product.
    # Empty = use ../frontend/dist when it exists; "none" = API only.
    frontend_dist: str | None = None
    # Developer / judging tools only, off by default: /api/v1/demo/* endpoints and an optional frozen "today"
    # (DEMO_TODAY, used only while DEMO_MODE is on) so deadlines never slip into the past during a demo.
    demo_mode: bool = False
    demo_today: date | None = None

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in ("prod", "production")

    @property
    def https_only(self) -> bool:
        return self.is_production if self.force_https is None else self.force_https

    @model_validator(mode="after")
    def _safe_production(self) -> "Settings":
        if not self.is_production:
            return self
        if self.demo_mode or self.mock_mode:
            raise ValueError("APP_ENV=production requires DEMO_MODE=false and MOCK_MODE=false")
        if len(self.jwt_secret) < 32 or self.jwt_secret in _PLACEHOLDER_SECRETS:
            raise ValueError("APP_ENV=production requires a random JWT_SECRET of at least 32 characters")
        if not self.data_encryption_key:
            raise ValueError("APP_ENV=production requires DATA_ENCRYPTION_KEY")
        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator(
        "ml_model_path",
        "adzuna_app_id",
        "adzuna_app_key",
        "grok_api_key",
        "data_encryption_key",
        "force_https",
        mode="before",
    )
    @classmethod
    def _empty_to_none(cls, v: object) -> object:
        return v or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
