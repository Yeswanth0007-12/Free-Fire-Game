import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.core.exceptions import FeatureDisabledException, InsufficientBalanceException
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionDirection, TransactionStatus
from app.schemas.common import ApiResponse
from app.schemas.wallet import (
    WalletResponse,
    WalletTransactionResponse,
    DepositRequest,
    WithdrawalRequest
)
from app.services.wallet_service import WalletService
from app.services.payment_service import PaymentService
from app.schemas.payment import CreatePaymentOrderRequest, PaymentOrderResponse

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("", response_model=ApiResponse[WalletResponse])
async def get_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallet = await WalletService.get_or_create_wallet(db, current_user.id)
    return ApiResponse.ok(
        data=WalletResponse(
            id=wallet.id,
            user_id=wallet.user_id,
            currency=wallet.currency,
            available_balance_minor=wallet.available_balance_minor,
            locked_balance_minor=wallet.locked_balance_minor,
            winning_balance_minor=wallet.winning_balance_minor,
            available_balance_formatted=f"₹{wallet.available_balance_minor / 100:.2f}",
            winning_balance_formatted=f"₹{wallet.winning_balance_minor / 100:.2f}"
        )
    )


@router.get("/transactions", response_model=ApiResponse[List[WalletTransactionResponse]])
async def get_transactions(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    txs = await WalletService.get_transactions(db, current_user.id, limit=limit, offset=offset)
    return ApiResponse.ok(data=[WalletTransactionResponse.model_validate(t) for t in txs])


@router.post("/deposit", response_model=ApiResponse[PaymentOrderResponse])
async def create_deposit_order(
    req: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    order_req = CreatePaymentOrderRequest(amount_minor=req.amount_minor)
    order = await PaymentService.create_order(db, current_user.id, order_req)
    return ApiResponse.ok(data=order, message="Deposit order initiated")


@router.post("/withdraw", response_model=ApiResponse[WalletTransactionResponse])
async def request_withdrawal(
    req: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check compliance feature flags
    if not settings.WITHDRAWALS_ENABLED:
        raise FeatureDisabledException("Withdrawals are temporarily disabled pending compliance review")

    wallet = await WalletService.get_or_create_wallet(db, current_user.id)
    if wallet.winning_balance_minor < req.amount_minor:
        raise InsufficientBalanceException(
            required_minor=req.amount_minor,
            available_minor=wallet.winning_balance_minor
        )

    # Post withdrawal debit
    withdrawal_id = str(uuid.uuid4())
    tx = await WalletService.post_transaction(
        db=db,
        user_id=current_user.id,
        type=TransactionType.WITHDRAWAL,
        amount_minor=req.amount_minor,
        direction=TransactionDirection.DEBIT,
        reference_type="WITHDRAWAL",
        reference_id=withdrawal_id,
        idempotency_key=f"WITHDRAWAL:{withdrawal_id}",
        description=f"Withdrawal to {req.payout_destination_type} ({req.payout_details})",
        is_winning=True
    )
    tx.status = TransactionStatus.PENDING
    await db.flush()

    return ApiResponse.ok(
        data=WalletTransactionResponse.model_validate(tx),
        message="Withdrawal request submitted and pending review"
    )
