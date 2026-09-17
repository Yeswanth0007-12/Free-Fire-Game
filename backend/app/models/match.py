from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class MatchStatus(str, Enum):
    DRAFT = "DRAFT"
    SCHEDULED = "SCHEDULED"
    REGISTRATION_OPEN = "REGISTRATION_OPEN"
    FULL = "FULL"
    REGISTRATION_CLOSED = "REGISTRATION_CLOSED"
    ROOM_READY = "ROOM_READY"
    IN_PROGRESS = "IN_PROGRESS"
    AWAITING_RESULT = "AWAITING_RESULT"
    RESULT_SUBMITTED = "RESULT_SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    SETTLED = "SETTLED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"
    COMPLETED = "COMPLETED"


class ResultStatus(str, Enum):
    PENDING = "PENDING"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISPUTED = "DISPUTED"


class SettlementStatus(str, Enum):
    UNSETTLED = "UNSETTLED"
    PROCESSING = "PROCESSING"
    SETTLED = "SETTLED"
    REFUNDED = "REFUNDED"


class RoomReleaseStatus(str, Enum):
    PENDING = "PENDING"
    RELEASED = "RELEASED"


class MatchHealthState(str, Enum):
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    ERROR = "ERROR"


class TeamAssignmentMode(str, Enum):
    AUTO = "AUTO"
    MANUAL = "MANUAL"


class Match(Base):
    __tablename__ = "matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    public_match_code = Column(String(32), unique=True, index=True, nullable=False)
    game_id = Column(String(36), ForeignKey("games.id"), nullable=False, index=True)
    mode_id = Column(String(36), ForeignKey("game_modes.id"), nullable=False, index=True)
    map_name = Column(String(100), default="Bermuda", nullable=False)
    match_format = Column(String(50), nullable=False)  # 1v1, 2v2, 4v4, SOLO

    entry_fee_minor = Column(BigInteger, default=0, nullable=False)  # in paise
    prize_pool_minor = Column(BigInteger, default=0, nullable=False)  # in paise
    currency = Column(String(3), default="INR", nullable=False)
    prize_distribution = Column(JSON, default=dict, nullable=False)  # e.g., {"1": 100} or {"1": 70, "2": 30}

    max_players = Column(Integer, nullable=False)
    current_players = Column(Integer, default=0, nullable=False)
    max_teams = Column(Integer, default=2, nullable=False)

    registration_start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    registration_close_at = Column(DateTime(timezone=True), nullable=False, index=True)
    match_start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    result_deadline_at = Column(DateTime(timezone=True), nullable=True)
    room_release_at = Column(DateTime(timezone=True), nullable=False)

    # Encrypted room credentials (AES-GCM/Fernet)
    room_id_encrypted = Column(Text, nullable=True)
    room_password_encrypted = Column(Text, nullable=True)

    host_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    team_assignment_mode = Column(String(20), default=TeamAssignmentMode.AUTO.value, nullable=False)

    status = Column(String(30), default=MatchStatus.SCHEDULED.value, nullable=False, index=True)
    result_status = Column(String(20), default=ResultStatus.PENDING.value, nullable=False, index=True)
    settlement_status = Column(String(20), default=SettlementStatus.UNSETTLED.value, nullable=False, index=True)
    room_release_status = Column(String(20), default=RoomReleaseStatus.PENDING.value, nullable=False, index=True)
    health_state = Column(String(20), default=MatchHealthState.HEALTHY.value, nullable=False, index=True)

    rules_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    game = relationship("Game", back_populates="matches", lazy="selectin")
    mode = relationship("GameMode", back_populates="matches", lazy="selectin")
    host = relationship("User", foreign_keys=[host_id])
    slots = relationship("MatchSlot", back_populates="match", cascade="all, delete-orphan", order_by="MatchSlot.slot_number")
    registrations = relationship("MatchRegistration", back_populates="match", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="match", cascade="all, delete-orphan")
    result = relationship("MatchResult", back_populates="match", uselist=False, cascade="all, delete-orphan")
    disputes = relationship("Dispute", back_populates="match")
