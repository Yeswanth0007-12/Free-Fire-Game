from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class DisputeType(str, Enum):
    RESULT = "RESULT"
    TEAM_ASSIGNMENT = "TEAM_ASSIGNMENT"
    MISSING_PRIZE = "MISSING_PRIZE"
    CANCELLATION = "CANCELLATION"
    TECHNICAL = "TECHNICAL"


class DisputeStatus(str, Enum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    RESOLVED_PLAYER = "RESOLVED_PLAYER"
    RESOLVED_OPPONENT = "RESOLVED_OPPONENT"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_id = Column(String(36), ForeignKey("matches.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    dispute_type = Column(String(30), nullable=False, index=True)
    description = Column(Text, nullable=False)
    status = Column(String(30), default=DisputeStatus.OPEN.value, nullable=False, index=True)

    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("Match", back_populates="disputes")
    user = relationship("User", back_populates="disputes", foreign_keys=[user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_user_id])
