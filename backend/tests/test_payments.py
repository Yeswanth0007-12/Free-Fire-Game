import pytest
from app.schemas.payment import CreatePaymentOrderRequest, VerifyPaymentRequest
from app.services.payment_service import PaymentService
from app.models.payment import PaymentStatus
from app.core.exceptions import InvalidPaymentSignatureException


@pytest.mark.asyncio
async def test_razorpay_order_and_verification(db_session, seed_test_data):
    data = seed_test_data
    player = data["player1"]

    # 1. Create payment order (₹100 deposit)
    req = CreatePaymentOrderRequest(amount_minor=10000)
    order = await PaymentService.create_order(db_session, player.id, req)
    assert order.provider == "RAZORPAY"
    assert order.amount_minor == 10000
    assert order.provider_order_id.startswith("order_sim_")

    # 2. Verify with valid simulation signature
    v_req = VerifyPaymentRequest(
        payment_id=order.payment_id,
        provider_order_id=order.provider_order_id,
        provider_payment_id="pay_sim_123456",
        provider_signature="sim_sig_valid"
    )
    payment = await PaymentService.verify_payment(db_session, player.id, v_req)
    assert payment.status == PaymentStatus.SUCCESS
    assert payment.provider_payment_id == "pay_sim_123456"

    # 3. Invalid signature on a new pending payment raises exception
    order2 = await PaymentService.create_order(db_session, player.id, req)
    v_invalid = VerifyPaymentRequest(
        payment_id=order2.payment_id,
        provider_order_id=order2.provider_order_id,
        provider_payment_id="pay_fake",
        provider_signature="invalid_sig"
    )
    with pytest.raises(InvalidPaymentSignatureException):
        await PaymentService.verify_payment(db_session, player.id, v_invalid)


@pytest.mark.asyncio
async def test_webhook_idempotency(db_session, seed_test_data):
    event_id = "evt_sample_unique_100"
    payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_999",
                    "order_id": "order_test_999",
                    "amount": 5000
                }
            }
        }
    }
    raw_body = b'{"event":"payment.captured"}'
    sig = "sim_webhook_sig"

    # First webhook arrival -> processed
    res1 = await PaymentService.process_webhook(
        db=db_session,
        event_id=event_id,
        event_type="payment.captured",
        payload=payload,
        signature=sig,
        raw_body=raw_body
    )
    assert res1["status"] == "processed"

    # Repeated webhook arrival (same event_id) -> ignored as duplicate
    res2 = await PaymentService.process_webhook(
        db=db_session,
        event_id=event_id,
        event_type="payment.captured",
        payload=payload,
        signature=sig,
        raw_body=raw_body
    )
    assert res2["status"] == "ignored"
    assert res2["reason"] == "duplicate_event"
