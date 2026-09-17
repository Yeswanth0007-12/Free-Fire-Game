import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer, BigInteger, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    PLAYER = "PLAYER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    MATCH_HOST = "MATCH_HOST"
    SUPPORT = "SUPPORT"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BANNED = "BANNED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(32), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.PLAYER.value, nullable=False, index=True)
    status = Column(String(20), default=UserStatus.ACTIVE.value, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    profile = relationship("PlayerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    gaming_identities = relationship("GamingIdentity", back_populates="user", cascade="all, delete-orphan", foreign_keys="[GamingIdentity.user_id]")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    registrations = relationship("MatchRegistration", back_populates="user")
    disputes = relationship("Dispute", back_populates="user", foreign_keys="[Dispute.user_id]")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
