import json
import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Free Fire Tournament Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database (Supabase PostgreSQL or local fallback)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./tournament.db",
        description="Async connection string (e.g. postgresql+asyncpg://postgres:pass@db.xxx.supabase.co:5432/postgres or sqlite+aiosqlite:///./tournament.db)"
    )

    # Redis (for background jobs, locks, pubsub)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & JWT
    JWT_SECRET: str = "super-secret-key-change-in-production-min32chars-ff-tournament-jwt-secret-key-2026"
    JWT_REFRESH_SECRET: str = "super-refresh-secret-key-change-in-production-min32chars-ff-refresh-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for dev convenience
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Symmetric encryption key for room credentials (AES-256 Fernet compatible base64 key)
    # Default 32-byte urlsafe base64 key for dev
    ENCRYPTION_KEY: str = "G5zW7vN8qX1kR4mP2sT9uV0wY3bE6hJ8aD1fC4gK7lM="

    # Payment Gateway - Razorpay (India)
    RAZORPAY_KEY_ID: str = "rzp_test_samplekey123"
    RAZORPAY_KEY_SECRET: str = "sample_secret_key_for_testing_123"
    RAZORPAY_WEBHOOK_SECRET: str = "sample_webhook_secret_123"
    PAYMENT_MODE_SIMULATION: bool = True  # Allows test checkouts when true

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://free-fire-game-rose.vercel.app",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:8000",
                    "https://free-fire-game-rose.vercel.app",
                ]
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(i).strip().rstrip("/") for i in parsed if i]
                except Exception:
                    pass
                v = v[1:-1]
            return [item.strip().strip("'\"").rstrip("/") for item in v.split(",") if item.strip()]
        elif isinstance(v, list):
            return [str(i).strip().rstrip("/") for i in v if i]
        return v

    # Firebase Authentication & Meta
    FIREBASE_PROJECT_ID: str = "ignite-ff-tournaments"
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_AUTH_MOCK: bool = True
    FACEBOOK_APP_ID: str = ""
    FACEBOOK_APP_SECRET: str = ""

    # Feature Flags & Compliance (Section 92)
    REAL_MONEY_ENABLED: bool = False
    WITHDRAWALS_ENABLED: bool = False
    PUBLIC_LAUNCH_ENABLED: bool = False
    MATCH_JOINING_ENABLED: bool = True
    PAYMENTS_ENABLED: bool = True
    UID_VERIFICATION_ENABLED: bool = True
    ROOM_RELEASE_ENABLED: bool = True
    RESULT_VERIFICATION_ENABLED: bool = True
    PUSH_NOTIFICATIONS_ENABLED: bool = True
    FORCE_UPDATE_ENABLED: bool = False
    MINIMUM_APP_VERSION: str = "1.0.0"
    LATEST_APP_VERSION: str = "1.0.0"
    DISPUTES_ENABLED: bool = True
    LEADERBOARD_ENABLED: bool = True
    NOTIFICATIONS_ENABLED: bool = True
    ADMIN_RESULT_ENABLED: bool = True

    # Financial invariants
    CURRENCY_DEFAULT: str = "INR"
    MIN_WITHDRAWAL_AMOUNT_PAISE: int = 10000  # ₹100.00
    MAX_WITHDRAWAL_AMOUNT_PAISE: int = 500000  # ₹5,000.00
    SLOT_RESERVATION_TIMEOUT_MINUTES: int = 5


settings = Settings()
