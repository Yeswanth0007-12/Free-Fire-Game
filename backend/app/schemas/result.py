from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.result import ResultSubmissionStatus


class PlacementInput(BaseModel):
    user_id: str
    team_id: Optional[str] = None
    placement: int  # 1 for 1st, 2 for 2nd
    kills: int = 0
    score: int = 0


class SubmitResultRequest(BaseModel):
    winning_team_id: Optional[str] = None
    winner_user_ids: List[str]  # UUIDs of winning players
    placements: List[PlacementInput] = []
    scores: Dict[str, Any] = {}
    notes: Optional[str] = None


class PlacementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    team_id: Optional[str] = None
    placement: int
    kills: int
    score: int
    payout_minor: int
    is_settled: bool
    player_name: Optional[str] = None
    free_fire_uid: Optional[str] = None


class MatchResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    match_id: str
    provider: str
    winning_team_id: Optional[str] = None
    winner_user_ids: List[str] = []
    submitted_by_user_id: str
    verified_by_user_id: Optional[str] = None
    status: ResultSubmissionStatus
    scores: Dict[str, Any] = {}
    notes: Optional[str] = None
    submitted_at: datetime
    verified_at: Optional[datetime] = None
    placements: List[PlacementResponse] = []


class ApproveResultRequest(BaseModel):
    confirm_settlement: bool = True
