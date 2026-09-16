from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Enum as SQLEnum, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class TransactionType(str, Enum):
    ENTRY_FEE = "ENTRY_FEE"
    PRIZE = "PRIZE"
    REFUND = "REFUND"
    WITHDRAWAL = "WITHDRAWAL"
    BONUS = "BONUS"
    ADJUSTMENT = "ADJUSTMENT"
    REVERSAL = "REVERSAL"
    DEPOSIT = "DEPOSIT"


class TransactionDirection(str, Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"


class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    currency = Column(String(3), default="INR", nullable=False)

    available_balance_minor = Column(BigInteger, default=0, nullable=False)
    locked_balance_minor = Column(BigInteger, default=0, nullable=False)
    winning_balance_minor = Column(BigInteger, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("available_balance_minor >= 0", name="chk_wallet_available_non_negative"),
        CheckConstraint("locked_balance_minor >= 0", name="chk_wallet_locked_non_negative"),
        CheckConstraint("winning_balance_minor >= 0", name="chk_wallet_winning_non_negative"),
    )


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    wallet_id = Column(String(36), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    amount_minor = Column(BigInteger, nullable=False)  # in paise
    direction = Column(SQLEnum(TransactionDirection), nullable=False)
    balance_after_minor = Column(BigInteger, nullable=False)

    reference_type = Column(String(50), nullable=False, index=True)  # MATCH, PAYMENT, WITHDRAWAL, ADMIN
    reference_id = Column(String(100), nullable=False, index=True)
    idempotency_key = Column(String(150), unique=True, index=True, nullable=False)

    description = Column(String(255), nullable=False)
    status = Column(SQLEnum(TransactionStatus), default=TransactionStatus.SUCCESS, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    wallet = relationship("Wallet", back_populates="transactions")
