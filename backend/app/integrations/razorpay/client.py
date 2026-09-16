import hmac
import hashlib
import uuid
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger


class RazorpayClient:
    def __init__(self, key_id: Optional[str] = None, key_secret: Optional[str] = None):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET

    async def create_order(
        self,
        amount_minor: int,
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay payment order.
        When in simulation mode, generates a valid deterministic order ID.
        """
        if settings.PAYMENT_MODE_SIMULATION or self.key_id.startswith("rzp_test_sample"):
            order_id = f"order_sim_{uuid.uuid4().hex[:16]}"
            logger.info(f"[SIMULATION] Created Razorpay order {order_id} for amount {amount_minor} {currency}")
            return {
                "id": order_id,
                "entity": "order",
                "amount": amount_minor,
                "amount_paid": 0,
                "amount_due": amount_minor,
                "currency": currency,
                "receipt": receipt or str(uuid.uuid4()),
                "status": "created",
                "notes": notes or {}
            }
        else:
            import httpx
            async with httpx.AsyncClient(auth=(self.key_id, self.key_secret)) as client:
                res = await client.post(
                    "https://api.razorpay.com/v1/orders",
                    json={
                        "amount": amount_minor,
                        "currency": currency,
                        "receipt": receipt or str(uuid.uuid4()),
                        "notes": notes or {}
                    }
                )
                res.raise_for_status()
                return res.json()

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str
    ) -> bool:
        """
        Verify the Razorpay payment signature: HMAC-SHA256(order_id + '|' + payment_id, key_secret).
        """
        if settings.PAYMENT_MODE_SIMULATION and signature.startswith("sim_sig_"):
            return True

        message = f"{order_id}|{payment_id}".encode("utf-8")
        expected_signature = hmac.new(
            self.key_secret.encode("utf-8"),
            message,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    def verify_webhook_signature(
        self,
        body_bytes: bytes,
        signature: str,
        webhook_secret: Optional[str] = None
    ) -> bool:
        """
        Verify incoming Razorpay webhook signature against RAZORPAY_WEBHOOK_SECRET.
        """
        secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET
        if settings.PAYMENT_MODE_SIMULATION and signature == "sim_webhook_sig":
            return True

        expected = hmac.new(
            secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)


razorpay_client = RazorpayClient()
