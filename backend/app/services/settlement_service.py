from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.exceptions import DuplicateSettlementException
from app.models.match import Match, MatchStatus, SettlementStatus
from app.models.result import MatchResult, PlacementResult
from app.models.registration import MatchRegistration, RegistrationStatus
from app.models.profile import PlayerProfile
from app.models.wallet import TransactionType, TransactionDirection
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.services.wallet_service import WalletService


class SettlementService:
    @staticmethod
    async def settle_match(
        db: AsyncSession,
        match: Match,
        result: MatchResult,
        admin_user_id: str
    ):
        """
        Atomically and idempotently calculate prize allocations, post wallet ledger credits,
        and mark match settled and completed.
        """
        # 1. Guard against duplicate settlement
        if match.settlement_status == SettlementStatus.SETTLED:
            raise DuplicateSettlementException(match.id)

        match.settlement_status = SettlementStatus.PROCESSING
        await db.flush()

        winner_ids = list(result.winner_user_ids or [])
        prize_pool = match.prize_pool_minor  # in paise

        # 2. Determine prize share per winner
        if winner_ids and prize_pool > 0:
            # Equal integer split among winners of the winning team / 1st place
            per_player_payout = prize_pool // len(winner_ids)

            for winner_id in winner_ids:
                idempotency_key = f"MATCH_PRIZE:{match.id}:{winner_id}"

                # Post credit to winner's wallet
                await WalletService.post_transaction(
                    db=db,
                    user_id=winner_id,
                    type=TransactionType.PRIZE,
                    amount_minor=per_player_payout,
                    direction=TransactionDirection.CREDIT,
                    reference_type="MATCH",
                    reference_id=match.id,
                    idempotency_key=idempotency_key,
                    description=f"Prize winnings for match {match.public_match_code}",
                    is_winning=True
                )

                # Update PlacementResult record if exists
                stmt = select(PlacementResult).where(
                    and_(
                        PlacementResult.match_result_id == result.id,
                        PlacementResult.user_id == winner_id
                    )
                )
                placement = (await db.execute(stmt)).scalar_one_or_none()
                if placement:
                    placement.payout_minor = per_player_payout
                    placement.is_settled = True

                # Notify winner
                notif = Notification(
                    user_id=winner_id,
                    type="PRIZE_CREDITED",
                    title="Victory! Prize Credited",
                    message=f"You won ₹{per_player_payout / 100:.2f} in match {match.public_match_code}. Funds added to your wallet!",
                    related_entity_type="MATCH",
                    related_entity_id=match.id
                )
                db.add(notif)

        # 3. Update player profiles stats for all confirmed participants
        reg_stmt = select(MatchRegistration).where(
            and_(
                MatchRegistration.match_id == match.id,
                MatchRegistration.status == RegistrationStatus.CONFIRMED
            )
        )
        registrations = list((await db.execute(reg_stmt)).scalars().all())

        for reg in registrations:
            p_stmt = select(PlayerProfile).where(PlayerProfile.user_id == reg.user_id)
            profile = (await db.execute(p_stmt)).scalar_one_or_none()
            if profile:
                profile.total_matches += 1
                if reg.user_id in winner_ids:
                    profile.total_wins += 1
                    profile.total_winnings_minor += (prize_pool // len(winner_ids)) if winner_ids else 0
                    profile.current_streak += 1
                else:
                    profile.total_losses += 1
                    profile.current_streak = 0

        # 4. Update match final state
        match.settlement_status = SettlementStatus.SETTLED
        match.status = MatchStatus.COMPLETED
        await db.flush()

        # 5. Record immutable admin audit log
        audit = AuditLog(
            actor_user_id=admin_user_id,
            action="ADMIN_SETTLED_MATCH",
            target_entity_type="MATCH",
            target_entity_id=match.id,
            before_state={"status": match.status.value, "settlement_status": "UNSETTLED"},
            after_state={"status": "COMPLETED", "settlement_status": "SETTLED", "prize_pool_minor": prize_pool, "winners": winner_ids}
        )
        db.add(audit)
        await db.flush()
