from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, JSON, Boolean
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class RiskSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskFlag(Base):
    __tablename__ = "risk_flags"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    risk_type = Column(String(100), nullable=False, index=True)  # DUPLICATE_FF_UID, RAPID_JOIN, SUSPICIOUS_SETTLEMENT
    severity = Column(SQLEnum(RiskSeverity), default=RiskSeverity.MEDIUM, nullable=False, index=True)
    details = Column(JSON, default=dict, nullable=False)
    resolved = Column(Boolean, default=False, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
