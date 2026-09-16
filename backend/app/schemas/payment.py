from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.payment import PaymentStatus


class CreatePaymentOrderRequest(BaseModel):
    amount_minor: int
    match_id: Optional[str] = None
    registration_id: Optional[str] = None


class PaymentOrderResponse(BaseModel):
    payment_id: str
    provider: str
    provider_order_id: str
    amount_minor: int
    currency: str
    razorpay_key_id: str


class VerifyPaymentRequest(BaseModel):
    payment_id: str
    provider_order_id: str
    provider_payment_id: str
    provider_signature: str


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    match_id: Optional[str] = None
    registration_id: Optional[str] = None
    provider: str
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    amount_minor: int
    currency: str
    status: PaymentStatus
    created_at: datetime
