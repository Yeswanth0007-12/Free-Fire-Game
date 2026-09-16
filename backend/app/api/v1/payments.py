from fastapi import APIRouter, Depends, Request, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.payment import (
    CreatePaymentOrderRequest,
    PaymentOrderResponse,
    VerifyPaymentRequest,
    PaymentResponse
)
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create", response_model=ApiResponse[PaymentOrderResponse])
async def create_payment_order(
    req: CreatePaymentOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    order = await PaymentService.create_order(db, current_user.id, req)
    return ApiResponse.ok(data=order, message="Payment order created successfully")


@router.post("/verify", response_model=ApiResponse[PaymentResponse])
async def verify_payment(
    req: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payment = await PaymentService.verify_payment(db, current_user.id, req)
    return ApiResponse.ok(data=PaymentResponse.model_validate(payment), message="Payment verified successfully")


@router.post("/webhook")
async def handle_payment_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None, alias="X-Razorpay-Signature"),
    x_razorpay_event_id: str = Header(None, alias="X-Razorpay-Event-Id"),
    db: AsyncSession = Depends(get_db)
):
    raw_body = await request.body()
    payload = await request.json()

    event_id = x_razorpay_event_id or payload.get("event_id") or payload.get("id") or str(uuid.uuid4())
    event_type = payload.get("event", "payment.captured")

    result = await PaymentService.process_webhook(
        db=db,
        event_id=event_id,
        event_type=event_type,
        payload=payload,
        signature=x_razorpay_signature or "",
        raw_body=raw_body
    )
    return ApiResponse.ok(data=result, message="Webhook processed")
