from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.wallet import TransactionType, TransactionDirection, TransactionStatus


class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    currency: str
    available_balance_minor: int
    locked_balance_minor: int
    winning_balance_minor: int
    available_balance_formatted: str
    winning_balance_formatted: str


class WalletTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    wallet_id: str
    type: TransactionType
    amount_minor: int
    direction: TransactionDirection
    balance_after_minor: int
    reference_type: str
    reference_id: str
    idempotency_key: str
    description: str
    status: TransactionStatus
    created_at: datetime


class DepositRequest(BaseModel):
    amount_minor: int = Field(ge=1000, description="Minimum deposit ₹10.00 (1000 paise)")


class WithdrawalRequest(BaseModel):
    amount_minor: int = Field(ge=10000, description="Minimum withdrawal ₹100.00 (10000 paise)")
    payout_destination_type: str = Field(pattern="^(UPI|BANK_TRANSFER)$")
    payout_details: str = Field(min_length=3, max_length=100)


class AdminAdjustmentRequest(BaseModel):
    user_id: str
    amount_minor: int = Field(gt=0)
    direction: TransactionDirection
    reason: str = Field(min_length=5, max_length=255)
