from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.match import MatchStatus, ResultStatus, SettlementStatus, TeamAssignmentMode
from app.schemas.game import GameModeResponse


class MatchCreateRequest(BaseModel):
    game_id: str
    mode_id: str
    map_name: str = "Bermuda"
    match_format: str  # 1v1, 2v2, 4v4, SOLO
    entry_fee_minor: int = Field(ge=0, description="Entry fee in paise")
    prize_pool_minor: int = Field(ge=0, description="Prize pool in paise")
    currency: str = "INR"
    prize_distribution: Dict[str, Any] = Field(default_factory=lambda: {"1": 100})
    max_players: int = Field(gt=0)
    max_teams: int = Field(default=2, gt=0)
    registration_start_at: datetime
    registration_close_at: datetime
    match_start_at: datetime
    room_release_at: datetime
    result_deadline_at: Optional[datetime] = None
    team_assignment_mode: TeamAssignmentMode = TeamAssignmentMode.AUTO
    rules_text: Optional[str] = None
    room_id: Optional[str] = None
    room_password: Optional[str] = None


class MatchUpdateRequest(BaseModel):
    map_name: Optional[str] = None
    registration_close_at: Optional[datetime] = None
    match_start_at: Optional[datetime] = None
    room_release_at: Optional[datetime] = None
    rules_text: Optional[str] = None
    room_id: Optional[str] = None
    room_password: Optional[str] = None
    status: Optional[MatchStatus] = None


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_match_code: str
    game_id: str
    mode_id: str
    map_name: str
    match_format: str
    entry_fee_minor: int
    prize_pool_minor: int
    currency: str
    prize_distribution: Dict[str, Any]
    max_players: int
    current_players: int
    max_teams: int
    registration_start_at: datetime
    registration_close_at: datetime
    match_start_at: datetime
    result_deadline_at: Optional[datetime] = None
    room_release_at: datetime
    team_assignment_mode: TeamAssignmentMode
    status: MatchStatus
    result_status: ResultStatus
    settlement_status: SettlementStatus
    rules_text: Optional[str] = None
    created_at: datetime
    mode: Optional[GameModeResponse] = None
    is_registered: Optional[bool] = None


MatchDetailResponse = MatchResponse


class RoomCredentialsResponse(BaseModel):
    match_id: str
    public_match_code: str
    room_id: Optional[str] = None
    room_password: Optional[str] = None
    is_released: bool
    release_time: datetime
    message: str


class SlotResponse(BaseModel):
    id: str
    slot_number: int
    team_id: Optional[str] = None
    status: str
    is_my_slot: Optional[bool] = False
    reserved_until: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SlotJoinRequest(BaseModel):
    slot_number: int = Field(gt=0, description="Slot number to reserve (1 to max_slots)")
    gaming_identity_id: Optional[str] = None


class MatchSlotsSummaryResponse(BaseModel):
    match_id: str
    max_slots: int
    available_slots: int
    reserved_slots: int
    confirmed_slots: int
    slots: List[SlotResponse]


class MatchFilterParams(BaseModel):
    mode: Optional[str] = None
    format: Optional[str] = None
    status: Optional[MatchStatus] = None
    min_entry_fee: Optional[int] = None
    max_entry_fee: Optional[int] = None
    limit: int = 50
    offset: int = 0
