import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class GamingIdentityStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    LOCKED = "LOCKED"
    UID_CHANGE_REQUESTED = "UID_CHANGE_REQUESTED"


class GamingIdentity(Base):
    __tablename__ = "gaming_identities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game = Column(String(50), default="Free Fire", nullable=False)
    free_fire_uid = Column(String(50), nullable=False, index=True)
    nickname = Column(String(100), nullable=False)
    status = Column(String(30), default=GamingIdentityStatus.PENDING_VERIFICATION.value, nullable=False, index=True)
    
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="gaming_identities", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    registrations = relationship("MatchRegistration", back_populates="gaming_identity")

    __table_args__ = (
        UniqueConstraint("free_fire_uid", "game", name="uq_gaming_identity_game_uid"),
    )
