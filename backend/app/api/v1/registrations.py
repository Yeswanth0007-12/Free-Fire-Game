from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.match import Match, MatchStatus
from app.models.registration import MatchRegistration, RegistrationStatus
from app.schemas.common import ApiResponse
from app.schemas.match import MatchResponse
from app.schemas.game import GameModeResponse

router = APIRouter(prefix="", tags=["My Matches"])


@router.get("/my-matches", response_model=ApiResponse[List[MatchResponse]])
async def get_my_matches(
    tab: Optional[str] = Query(None, description="UPCOMING, LIVE, COMPLETED, DISPUTED"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Match)
        .join(MatchRegistration, MatchRegistration.match_id == Match.id)
        .where(
            MatchRegistration.user_id == current_user.id,
            MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
        )
    )

    if tab == "UPCOMING":
        stmt = stmt.where(Match.status.in_([MatchStatus.SCHEDULED, MatchStatus.REGISTRATION_OPEN, MatchStatus.FULL, MatchStatus.REGISTRATION_CLOSED]))
    elif tab == "LIVE":
        stmt = stmt.where(Match.status.in_([MatchStatus.ROOM_READY, MatchStatus.IN_PROGRESS, MatchStatus.AWAITING_RESULT, MatchStatus.RESULT_SUBMITTED, MatchStatus.UNDER_REVIEW]))
    elif tab == "COMPLETED":
        stmt = stmt.where(Match.status.in_([MatchStatus.VERIFIED, MatchStatus.SETTLED, MatchStatus.COMPLETED]))
    elif tab == "DISPUTED":
        stmt = stmt.where(Match.status == MatchStatus.DISPUTED)

    stmt = stmt.order_by(Match.match_start_at.desc())
    matches = list((await db.execute(stmt)).scalars().all())

    response_list = []
    for m in matches:
        data = MatchResponse.model_validate(m)
        data.is_registered = True
        if m.mode:
            data.mode = GameModeResponse.model_validate(m.mode)
        response_list.append(data)

    return ApiResponse.ok(data=response_list)
