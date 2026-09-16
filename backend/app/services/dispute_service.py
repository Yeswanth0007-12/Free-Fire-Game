from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.exceptions import EntityNotFoundException, AppException
from app.models.dispute import Dispute, DisputeType, DisputeStatus
from app.models.match import Match
from app.models.wallet import TransactionType, TransactionDirection
from app.models.registration import MatchRegistration, RegistrationStatus
from app.schemas.dispute import CreateDisputeRequest, ResolveDisputeRequest
from app.services.wallet_service import WalletService


class DisputeService:
    @staticmethod
    async def create_dispute(db: AsyncSession, user_id: str, req: CreateDisputeRequest) -> Dispute:
        match_stmt = select(Match).where(Match.id == req.match_id)
        match = (await db.execute(match_stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", req.match_id)

        dispute = Dispute(
            match_id=req.match_id,
            user_id=user_id,
            dispute_type=req.dispute_type,
            description=req.description,
            status=DisputeStatus.OPEN
        )
        db.add(dispute)
        await db.flush()
        return dispute

    @staticmethod
    async def get_user_disputes(db: AsyncSession, user_id: str) -> List[Dispute]:
        stmt = select(Dispute).where(Dispute.user_id == user_id).order_by(Dispute.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_all_disputes(db: AsyncSession, status: Optional[DisputeStatus] = None) -> List[Dispute]:
        stmt = select(Dispute)
        if status:
            stmt = stmt.where(Dispute.status == status)
        stmt = stmt.order_by(Dispute.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def resolve_dispute(
        db: AsyncSession,
        dispute_id: str,
        admin_user_id: str,
        req: ResolveDisputeRequest
    ) -> Dispute:
        stmt = select(Dispute).where(Dispute.id == dispute_id).with_for_update()
        dispute = (await db.execute(stmt)).scalar_one_or_none()
        if not dispute:
            raise EntityNotFoundException("Dispute", dispute_id)

        dispute.status = req.status
        dispute.resolution_notes = req.resolution_notes
        dispute.resolved_by_user_id = admin_user_id
        dispute.resolved_at = datetime.now(timezone.utc)

        if req.refund_player:
            # Find match registration to refund
            reg_stmt = select(MatchRegistration).where(
                and_(
                    MatchRegistration.match_id == dispute.match_id,
                    MatchRegistration.user_id == dispute.user_id
                )
            )
            reg = (await db.execute(reg_stmt)).scalar_one_or_none()
            if reg and reg.entry_fee_minor > 0:
                await WalletService.post_transaction(
                    db=db,
                    user_id=dispute.user_id,
                    type=TransactionType.REFUND,
                    amount_minor=reg.entry_fee_minor,
                    direction=TransactionDirection.CREDIT,
                    reference_type="DISPUTE",
                    reference_id=dispute.id,
                    idempotency_key=f"DISPUTE_REFUND:{dispute.id}",
                    description=f"Dispute resolution refund for match ({req.resolution_notes})"
                )

        await db.flush()
        return dispute
