from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.exceptions import EntityNotFoundException, InvalidPaymentSignatureException, AppException
from app.core.config import settings
from app.integrations.razorpay.client import razorpay_client
from app.models.payment import Payment, PaymentWebhookLog, PaymentStatus
from app.models.registration import MatchRegistration, RegistrationStatus
from app.models.match import Match, MatchStatus
from app.models.wallet import TransactionType, TransactionDirection
from app.schemas.payment import CreatePaymentOrderRequest, PaymentOrderResponse, VerifyPaymentRequest
from app.services.wallet_service import WalletService
from app.services.match_service import MatchService


class PaymentService:
    @staticmethod
    async def create_order(
        db: AsyncSession,
        user_id: str,
        req: CreatePaymentOrderRequest
    ) -> PaymentOrderResponse:
        # Create Razorpay order
        rp_order = await razorpay_client.create_order(
            amount_minor=req.amount_minor,
            currency="INR",
            receipt=f"rcpt_{user_id[:8]}",
            notes={"user_id": user_id, "match_id": req.match_id or ""}
        )

        payment = Payment(
            user_id=user_id,
            match_id=req.match_id,
            registration_id=req.registration_id,
            provider="RAZORPAY",
            provider_order_id=rp_order["id"],
            amount_minor=req.amount_minor,
            currency="INR",
            status=PaymentStatus.CREATED,
            notes=rp_order.get("notes", {})
        )
        db.add(payment)
        await db.flush()

        return PaymentOrderResponse(
            payment_id=payment.id,
            provider="RAZORPAY",
            provider_order_id=rp_order["id"],
            amount_minor=req.amount_minor,
            currency="INR",
            razorpay_key_id=settings.RAZORPAY_KEY_ID
        )

    @staticmethod
    async def verify_payment(
        db: AsyncSession,
        user_id: str,
        req: VerifyPaymentRequest
    ) -> Payment:
        # 1. Fetch internal payment record
        stmt = select(Payment).where(
            and_(Payment.id == req.payment_id, Payment.user_id == user_id)
        ).with_for_update()
        payment = (await db.execute(stmt)).scalar_one_or_none()
        if not payment:
            raise EntityNotFoundException("Payment", req.payment_id)

        # 2. Check already processed
        if payment.status == PaymentStatus.SUCCESS:
            return payment

        # 3. Verify Razorpay cryptographic signature
        is_valid = razorpay_client.verify_payment_signature(
            order_id=req.provider_order_id,
            payment_id=req.provider_payment_id,
            signature=req.provider_signature
        )
        if not is_valid:
            payment.status = PaymentStatus.FAILED
            await db.flush()
            raise InvalidPaymentSignatureException()

        # 4. Mark payment success
        payment.provider_payment_id = req.provider_payment_id
        payment.provider_signature = req.provider_signature
        payment.status = PaymentStatus.SUCCESS
        await db.flush()

        # 5. If linked to a match registration, confirm registration and slot
        if payment.registration_id:
            reg_stmt = select(MatchRegistration).where(MatchRegistration.id == payment.registration_id).with_for_update()
            reg = (await db.execute(reg_stmt)).scalar_one_or_none()
            if reg and reg.status == RegistrationStatus.RESERVED:
                reg.status = RegistrationStatus.CONFIRMED
                reg.payment_id = payment.id

                # Increment match players
                match_stmt = select(Match).where(Match.id == reg.match_id).with_for_update()
                match = (await db.execute(match_stmt)).scalar_one_or_none()
                if match:
                    match.current_players += 1
                    if match.current_players >= match.max_players:
                        match.status = MatchStatus.FULL
                    await MatchService._assign_team(db, match, reg, user_id)
                await db.flush()
        else:
            # Wallet deposit flow
            await WalletService.post_transaction(
                db=db,
                user_id=user_id,
                type=TransactionType.DEPOSIT,
                amount_minor=payment.amount_minor,
                direction=TransactionDirection.CREDIT,
                reference_type="PAYMENT",
                reference_id=payment.id,
                idempotency_key=f"DEPOSIT:{payment.id}",
                description=f"Wallet deposit via Razorpay ({payment.provider_payment_id})"
            )

        return payment

    @staticmethod
    async def process_webhook(
        db: AsyncSession,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
        signature: str,
        raw_body: bytes
    ) -> Dict[str, Any]:
        """
        Idempotent payment webhook processing with anti-replay log.
        """
        # 1. Anti-replay duplicate check
        stmt = select(PaymentWebhookLog).where(PaymentWebhookLog.event_id == event_id)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            return {"status": "ignored", "reason": "duplicate_event", "event_id": event_id}

        # 2. Verify signature
        if not razorpay_client.verify_webhook_signature(raw_body, signature):
            raise InvalidPaymentSignatureException("Invalid webhook signature")

        # 3. Log webhook
        log_entry = PaymentWebhookLog(
            provider="RAZORPAY",
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            is_processed=True
        )
        db.add(log_entry)
        await db.flush()

        # 4. Handle events
        if event_type in ("payment.captured", "order.paid"):
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")

            if order_id:
                p_stmt = select(Payment).where(Payment.provider_order_id == order_id).with_for_update()
                payment = (await db.execute(p_stmt)).scalar_one_or_none()
                if payment and payment.status != PaymentStatus.SUCCESS:
                    payment.status = PaymentStatus.SUCCESS
                    payment.provider_payment_id = payment_id
                    await db.flush()

                    if payment.registration_id:
                        reg_stmt = select(MatchRegistration).where(MatchRegistration.id == payment.registration_id).with_for_update()
                        reg = (await db.execute(reg_stmt)).scalar_one_or_none()
                        if reg and reg.status == RegistrationStatus.RESERVED:
                            reg.status = RegistrationStatus.CONFIRMED
                            reg.payment_id = payment.id
                            match_stmt = select(Match).where(Match.id == reg.match_id).with_for_update()
                            match = (await db.execute(match_stmt)).scalar_one_or_none()
                            if match:
                                match.current_players += 1
                                if match.current_players >= match.max_players:
                                    match.status = MatchStatus.FULL
                                await MatchService._assign_team(db, match, reg, reg.user_id)
                            await db.flush()

        return {"status": "processed", "event_id": event_id}
