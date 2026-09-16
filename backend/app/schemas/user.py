from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole, UserStatus


class PlayerProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    avatar_url: Optional[str] = None
    free_fire_uid: str
    free_fire_name: str
    preferred_game: str
    total_matches: int
    total_wins: int
    total_losses: int
    total_winnings_minor: int
    current_streak: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    is_verified: bool
    created_at: datetime
    profile: Optional[PlayerProfileResponse] = None


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    free_fire_name: Optional[str] = None
    free_fire_uid: Optional[str] = None
