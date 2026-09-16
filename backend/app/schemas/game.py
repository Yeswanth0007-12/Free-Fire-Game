from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class GameModeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    game_id: str
    name: str
    slug: str
    format: str
    team_size: int
    min_players: int
    max_players: int
    requires_teams: bool
    active: bool


class GameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    active: bool
    modes: List[GameModeResponse] = []
