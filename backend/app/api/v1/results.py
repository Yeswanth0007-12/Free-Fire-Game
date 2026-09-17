from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_host_or_admin, require_admin
from app.models.user import User
from app.models.result import MatchResult, PlacementResult
from app.models.profile import PlayerProfile
from app.schemas.common import ApiResponse
from app.schemas.result import (
    SubmitResultRequest,
    ApproveResultRequest,
    MatchResultResponse,
    PlacementResponse
)
from app.schemas.match import MatchResponse
from app.services.result_service import ResultService

router = APIRouter(prefix="", tags=["Results"])


@router.get("/matches/{match_id}/result", response_model=ApiResponse[MatchResultResponse])
async def get_match_result(
    match_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(MatchResult).where(MatchResult.match_id == match_id)
    result = (await db.execute(stmt)).scalar_one_or_none()
    if not result:
        return ApiResponse.fail("NOT_FOUND", "No result recorded for this match")

    # Fetch placements
    p_stmt = select(PlacementResult).where(PlacementResult.match_result_id == result.id).order_by(PlacementResult.placement.asc())
    placements = list((await db.execute(p_stmt)).scalars().all())

    p_responses = []
    for p in placements:
        u_stmt = select(PlayerProfile).where(PlayerProfile.user_id == p.user_id)
        prof = (await db.execute(u_stmt)).scalar_one_or_none()
        p_responses.append(
            PlacementResponse(
                id=p.id,
                user_id=p.user_id,
                team_id=p.team_id,
                placement=p.placement,
                kills=p.kills,
                score=p.score,
                payout_minor=p.payout_minor,
                is_settled=p.is_settled,
                player_name=prof.display_name if prof else "Player",
                free_fire_uid=prof.free_fire_uid if prof else ""
            )
        )

    res_data = MatchResultResponse(
        id=result.id,
        match_id=result.match_id,
        provider=result.provider,
        winning_team_id=result.winning_team_id,
        winner_user_ids=result.winner_user_ids or [],
        submitted_by_user_id=result.submitted_by_user_id,
        verified_by_user_id=result.verified_by_user_id,
        status=result.status,
        scores=result.scores or {},
        notes=result.notes,
        submitted_at=result.submitted_at,
        verified_at=result.verified_at,
        placements=p_responses
    )
    return ApiResponse.ok(data=res_data)


@router.post("/admin/matches/{match_id}/submit-result", response_model=ApiResponse[MatchResultResponse])
async def submit_match_result(
    match_id: str,
    req: SubmitResultRequest,
    current_user: User = Depends(require_host_or_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await ResultService.submit_result(
        db=db,
        match_id=match_id,
        submitted_by_user_id=current_user.id,
        req=req
    )
    return ApiResponse.ok(data=MatchResultResponse.model_validate(result), message="Structured result submitted for review")


@router.post("/admin/matches/{match_id}/approve-result", response_model=ApiResponse[MatchResponse])
@router.post("/admin/matches/{match_id}/approve", response_model=ApiResponse[MatchResponse])
async def approve_match_result(
    match_id: str,
    req: Optional[ApproveResultRequest] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    match = await ResultService.approve_result(
        db=db,
        match_id=match_id,
        verified_by_user_id=current_user.id
    )
    return ApiResponse.ok(data=MatchResponse.model_validate(match), message="Result approved and prize settled atomically!")


@router.post("/admin/matches/{match_id}/reject-result", response_model=ApiResponse[MatchResponse])
async def reject_match_result(
    match_id: str,
    notes: Optional[str] = "Result rejected after verification check",
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    match = await ResultService.reject_result(
        db=db,
        match_id=match_id,
        verified_by_user_id=current_user.id,
        notes=notes
    )
    return ApiResponse.ok(data=MatchResponse.model_validate(match), message="Result rejected and match returned to awaiting result state")
