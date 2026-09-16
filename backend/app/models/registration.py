from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum as SQLEnum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class RegistrationStatus(str, Enum):
    RESERVED = "RESERVED"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class MatchRegistration(Base):
    __tablename__ = "match_registrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.RESERVED, nullable=False, index=True)
    slot_number = Column(Integer, nullable=False)
    reserved_until = Column(DateTime(timezone=True), nullable=True)  # expires if unconfirmed

    payment_id = Column(String(36), nullable=True, index=True)
    entry_fee_minor = Column(BigInteger, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    match = relationship("Match", back_populates="registrations")
    user = relationship("User", back_populates="registrations")
    team_member = relationship("TeamMember", back_populates="registration", uselist=False)

    __table_args__ = (
        UniqueConstraint("match_id", "slot_number", name="uq_match_slot"),
    )
