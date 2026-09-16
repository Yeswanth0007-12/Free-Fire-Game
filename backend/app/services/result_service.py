from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.exceptions import EntityNotFoundException, AppException
from app.models.match import Match, MatchStatus, ResultStatus
from app.models.result import MatchResult, PlacementResult, ResultSubmissionStatus
from app.schemas.result import SubmitResultRequest, PlacementInput
from app.services.settlement_service import SettlementService


class ResultProvider(ABC):
    """
    Abstract interface for tournament result sources.
    Allows seamless future addition of automated game APIs or webhooks
    without rewriting match, wallet, or settlement architecture.
    """
    @abstractmethod
    async def fetch_result(self, match_reference: str) -> Dict[str, Any]:
        """Fetch match result details from provider."""
        pass


class AdminManualResultProvider(ResultProvider):
    """V1 Controlled Admin/Host structured result provider."""
    async def fetch_result(self, match_reference: str) -> Dict[str, Any]:
        return {"provider": "ADMIN_MANUAL", "reference": match_reference}


class ResultService:
    @staticmethod
    async def submit_result(
        db: AsyncSession,
        match_id: str,
        submitted_by_user_id: str,
        req: SubmitResultRequest
    ) -> MatchResult:
        stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        # Check existing result
        res_stmt = select(MatchResult).where(MatchResult.match_id == match_id)
        existing_result = (await db.execute(res_stmt)).scalar_one_or_none()

        if existing_result:
            result = existing_result
            result.winning_team_id = req.winning_team_id
            result.winner_user_ids = req.winner_user_ids
            result.scores = req.scores
            result.notes = req.notes
            result.status = ResultSubmissionStatus.SUBMITTED
            result.submitted_at = datetime.now(timezone.utc)
            # Clear previous placements
            for p in list(result.placements):
                await db.delete(p)
        else:
            result = MatchResult(
                match_id=match.id,
                provider="ADMIN_MANUAL",
                winning_team_id=req.winning_team_id,
                winner_user_ids=req.winner_user_ids,
                submitted_by_user_id=submitted_by_user_id,
                status=ResultSubmissionStatus.SUBMITTED,
                scores=req.scores,
                notes=req.notes,
                submitted_at=datetime.now(timezone.utc)
            )
            db.add(result)
            await db.flush()

        # Add placement records
        for p_input in req.placements:
            placement = PlacementResult(
                match_result_id=result.id,
                user_id=p_input.user_id,
                team_id=p_input.team_id,
                placement=p_input.placement,
                kills=p_input.kills,
                score=p_input.score,
                payout_minor=0,
                is_settled=False
            )
            db.add(placement)

        # Transition match status to RESULT_SUBMITTED
        match.status = MatchStatus.RESULT_SUBMITTED
        match.result_status = ResultStatus.SUBMITTED
        await db.flush()

        return result

    @staticmethod
    async def approve_result(
        db: AsyncSession,
        match_id: str,
        verified_by_user_id: str
    ) -> Match:
        """
        Verify result and trigger idempotent wallet settlement.
        """
        stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        res_stmt = select(MatchResult).where(MatchResult.match_id == match_id)
        result = (await db.execute(res_stmt)).scalar_one_or_none()
        if not result:
            raise AppException("No submitted result found for this match", code="NO_RESULT_FOUND")

        result.status = ResultSubmissionStatus.APPROVED
        result.verified_by_user_id = verified_by_user_id
        result.verified_at = datetime.now(timezone.utc)

        match.status = MatchStatus.VERIFIED
        match.result_status = ResultStatus.APPROVED
        await db.flush()

        # Trigger settlement
        await SettlementService.settle_match(db, match, result, verified_by_user_id)
        return match

    @staticmethod
    async def reject_result(
        db: AsyncSession,
        match_id: str,
        verified_by_user_id: str,
        notes: str
    ) -> Match:
        stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        res_stmt = select(MatchResult).where(MatchResult.match_id == match_id)
        result = (await db.execute(res_stmt)).scalar_one_or_none()
        if result:
            result.status = ResultSubmissionStatus.REJECTED
            result.verified_by_user_id = verified_by_user_id
            result.notes = (result.notes or "") + f" [REJECTED: {notes}]"

        match.status = MatchStatus.AWAITING_RESULT
        match.result_status = ResultStatus.REJECTED
        await db.flush()
        return match
