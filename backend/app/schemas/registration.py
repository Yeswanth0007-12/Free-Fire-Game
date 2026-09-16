from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.registration import RegistrationStatus
from app.schemas.match import MatchResponse


class JoinMatchRequest(BaseModel):
    payment_method: str = "WALLET"  # "WALLET" or "RAZORPAY"


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    match_id: str
    user_id: str
    team_id: Optional[str] = None
    status: RegistrationStatus
    slot_number: int
    reserved_until: Optional[datetime] = None
    entry_fee_minor: int
    created_at: datetime
    match: Optional[MatchResponse] = None
    player_name: Optional[str] = None
    free_fire_uid: Optional[str] = None
