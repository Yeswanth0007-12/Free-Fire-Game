from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import PlayerProfileResponse


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    registration_id: str
    user_id: str
    joined_at: datetime
    player_name: Optional[str] = None
    free_fire_uid: Optional[str] = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    match_id: str
    name: str
    slot_number: int
    captain_registration_id: Optional[str] = None
    status: str
    members: List[TeamMemberResponse] = []
