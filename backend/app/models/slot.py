import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class SlotStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    CONFIRMED = "CONFIRMED"
    BLOCKED = "BLOCKED"


class MatchSlot(Base):
    __tablename__ = "match_slots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_number = Column(Integer, nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(20), default=SlotStatus.AVAILABLE.value, nullable=False, index=True)
    registration_id = Column(String(36), ForeignKey("match_registrations.id", ondelete="SET NULL"), nullable=True, index=True)
    reserved_until = Column(DateTime(timezone=True), nullable=True, index=True)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    match = relationship("Match", back_populates="slots")
    team = relationship("Team", foreign_keys=[team_id])
    registration = relationship("MatchRegistration", back_populates="slot", foreign_keys=[registration_id])

    __table_args__ = (
        UniqueConstraint("match_id", "slot_number", name="uq_match_slot_number"),
    )
