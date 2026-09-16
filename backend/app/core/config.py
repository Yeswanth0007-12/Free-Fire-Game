import os
from typing import List
from pydantic import Field
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
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Feature Flags & Compliance
    REAL_MONEY_ENABLED: bool = False
    WITHDRAWALS_ENABLED: bool = False
    PUBLIC_LAUNCH_ENABLED: bool = False
    MATCH_JOINING_ENABLED: bool = True
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
