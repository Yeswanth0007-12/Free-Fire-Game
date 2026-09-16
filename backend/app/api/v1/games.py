from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.game import Game, GameMode
from app.schemas.common import ApiResponse
from app.schemas.game import GameResponse, GameModeResponse

router = APIRouter(prefix="/games", tags=["Games"])


@router.get("", response_model=ApiResponse[List[GameResponse]])
async def list_games(db: AsyncSession = Depends(get_db)):
    stmt = select(Game).where(Game.active == True)
    result = await db.execute(stmt)
    games = list(result.scalars().all())

    response_data = []
    for g in games:
        modes_stmt = select(GameMode).where(GameMode.game_id == g.id, GameMode.active == True)
        modes = list((await db.execute(modes_stmt)).scalars().all())
        response_data.append(
            GameResponse(
                id=g.id,
                name=g.name,
                slug=g.slug,
                active=g.active,
                modes=[GameModeResponse.model_validate(m) for m in modes]
            )
        )
    return ApiResponse.ok(data=response_data)


@router.get("/{game_id}/modes", response_model=ApiResponse[List[GameModeResponse]])
async def list_game_modes(game_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(GameMode).where(GameMode.game_id == game_id, GameMode.active == True)
    result = await db.execute(stmt)
    modes = list(result.scalars().all())
    return ApiResponse.ok(data=[GameModeResponse.model_validate(m) for m in modes])
