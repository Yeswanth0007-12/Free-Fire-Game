from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.dispute import DisputeType, DisputeStatus


class CreateDisputeRequest(BaseModel):
    match_id: str
    dispute_type: DisputeType
    description: str


class ResolveDisputeRequest(BaseModel):
    status: DisputeStatus  # RESOLVED_PLAYER, RESOLVED_OPPONENT, REJECTED, CANCELLED
    resolution_notes: str
    refund_player: bool = False


class DisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    match_id: str
    user_id: str
    dispute_type: DisputeType
    description: str
    status: DisputeStatus
    resolution_notes: Optional[str] = None
    resolved_by_user_id: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    player_name: Optional[str] = None
    match_code: Optional[str] = None
