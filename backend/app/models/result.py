from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum as SQLEnum, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class ResultSubmissionStatus(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_id = Column(String(36), ForeignKey("matches.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    provider = Column(String(50), default="ADMIN_MANUAL", nullable=False)
    winning_team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)
    winner_user_ids = Column(JSON, default=list, nullable=False)  # list of user UUIDs

    submitted_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    verified_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    status = Column(SQLEnum(ResultSubmissionStatus), default=ResultSubmissionStatus.SUBMITTED, nullable=False, index=True)
    scores = Column(JSON, default=dict, nullable=False)  # team scores, rounds won/lost
    raw_payload = Column(JSON, default=dict, nullable=False)
    notes = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("Match", back_populates="result")
    placements = relationship("PlacementResult", back_populates="match_result", cascade="all, delete-orphan")


class PlacementResult(Base):
    __tablename__ = "placement_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    match_result_id = Column(String(36), ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)

    placement = Column(Integer, nullable=False)  # 1 for 1st place, 2 for 2nd, etc.
    kills = Column(Integer, default=0, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    payout_minor = Column(BigInteger, default=0, nullable=False)  # prize credited
    is_settled = Column(Boolean, default=False, nullable=False)

    match_result = relationship("MatchResult", back_populates="placements")
    user = relationship("User")
