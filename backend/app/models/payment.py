from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Text, JSON, Boolean
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    match_id = Column(String(36), ForeignKey("matches.id"), nullable=True, index=True)
    registration_id = Column(String(36), ForeignKey("match_registrations.id"), nullable=True, index=True)

    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_order_id = Column(String(100), index=True, nullable=True)
    provider_payment_id = Column(String(100), index=True, nullable=True)
    provider_signature = Column(String(255), nullable=True)

    amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.CREATED, nullable=False, index=True)

    notes = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class PaymentWebhookLog(Base):
    __tablename__ = "payment_webhook_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    event_id = Column(String(100), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    is_processed = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
