from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.match import Match, MatchStatus
from app.models.team import Team, TeamMember
from app.models.profile import PlayerProfile
from app.schemas.common import ApiResponse
from app.schemas.match import (
    MatchResponse,
    MatchDetailResponse,
    MatchFilterParams,
    RoomCredentialsResponse
)
from app.schemas.team import TeamResponse, TeamMemberResponse
from app.schemas.registration import JoinMatchRequest, RegistrationResponse
from app.schemas.game import GameModeResponse
from app.services.match_service import MatchService
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.get("", response_model=ApiResponse[List[MatchResponse]])
async def list_matches(
    mode: Optional[str] = Query(None),
    format: Optional[str] = Query(None),
    status_filter: Optional[MatchStatus] = Query(None, alias="status"),
    min_entry_fee: Optional[int] = Query(None),
    max_entry_fee: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    params = MatchFilterParams(
        mode=mode,
        format=format,
        status=status_filter,
        min_entry_fee=min_entry_fee,
        max_entry_fee=max_entry_fee,
        limit=limit,
        offset=offset
    )
    matches_with_reg = await MatchService.get_matches(db, params)

    response_list = []
    for match, is_reg in matches_with_reg:
        data = MatchResponse.model_validate(match)
        data.is_registered = is_reg
        if match.mode:
            data.mode = GameModeResponse.model_validate(match.mode)
        response_list.append(data)

    return ApiResponse.ok(data=response_list)


@router.get("/{match_id}", response_model=ApiResponse[MatchResponse])
async def get_match_by_id(
    match_id: str,
    db: AsyncSession = Depends(get_db)
):
    match, is_reg = await MatchService.get_match_detail(db, match_id)
    data = MatchResponse.model_validate(match)
    data.is_registered = is_reg
    if match.mode:
        data.mode = GameModeResponse.model_validate(match.mode)
    return ApiResponse.ok(data=data)


@router.get("/{match_id}/room", response_model=ApiResponse[RoomCredentialsResponse])
async def get_room_credentials(
    match_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    creds = await MatchService.get_room_credentials(db, match_id, current_user.id)
    return ApiResponse.ok(data=creds)


@router.get("/{match_id}/teams", response_model=ApiResponse[List[TeamResponse]])
async def get_match_teams(
    match_id: str,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Team).where(Team.match_id == match_id).order_by(Team.slot_number.asc())
    teams = list((await db.execute(stmt)).scalars().all())

    team_responses = []
    for t in teams:
        mem_stmt = select(TeamMember).where(TeamMember.team_id == t.id)
        members = list((await db.execute(mem_stmt)).scalars().all())
        mem_responses = []
        for m in members:
            # fetch player profile
            p_stmt = select(PlayerProfile).where(PlayerProfile.user_id == m.user_id)
            prof = (await db.execute(p_stmt)).scalar_one_or_none()
            mem_responses.append(
                TeamMemberResponse(
                    id=m.id,
                    team_id=m.team_id,
                    registration_id=m.registration_id,
                    user_id=m.user_id,
                    joined_at=m.joined_at,
                    player_name=prof.display_name if prof else "Player",
                    free_fire_uid=prof.free_fire_uid if prof else ""
                )
            )
        team_responses.append(
            TeamResponse(
                id=t.id,
                match_id=t.match_id,
                name=t.name,
                slot_number=t.slot_number,
                captain_registration_id=t.captain_registration_id,
                status=t.status,
                members=mem_responses
            )
        )

    return ApiResponse.ok(data=team_responses)


@router.post("/{match_id}/join", response_model=ApiResponse[RegistrationResponse])
async def join_match(
    match_id: str,
    req: JoinMatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    reg = await MatchService.join_match(
        db=db,
        match_id=match_id,
        user_id=current_user.id,
        payment_method=req.payment_method
    )

    # Broadcast real-time slot update via WebSocket
    match, _ = await MatchService.get_match_detail(db, match_id)
    await ws_manager.broadcast_match_event(
        match_id=match_id,
        event_type="SLOT_OCCUPIED",
        data={"current_players": match.current_players, "max_players": match.max_players}
    )

    # Fetch profile info for response
    p_stmt = select(PlayerProfile).where(PlayerProfile.user_id == current_user.id)
    profile = (await db.execute(p_stmt)).scalar_one_or_none()

    reg_data = RegistrationResponse(
        id=reg.id,
        match_id=reg.match_id,
        user_id=reg.user_id,
        team_id=reg.team_id,
        status=reg.status,
        slot_number=reg.slot_number,
        reserved_until=reg.reserved_until,
        entry_fee_minor=reg.entry_fee_minor,
        created_at=reg.created_at,
        player_name=profile.display_name if profile else "Player",
        free_fire_uid=profile.free_fire_uid if profile else ""
    )
    return ApiResponse.ok(data=reg_data, message="Successfully joined tournament match!")
