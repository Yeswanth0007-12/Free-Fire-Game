from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.gaming_identity import GamingIdentityStatus


class CreateGamingIdentityRequest(BaseModel):
    free_fire_uid: str = Field(..., min_length=6, max_length=20, description="Numeric Free Fire UID")
    nickname: str = Field(..., min_length=2, max_length=50, description="In-game nickname")

    @field_validator("free_fire_uid")
    @classmethod
    def validate_numeric_uid(cls, v: str) -> str:
        clean = v.strip()
        if not clean.isdigit():
            raise ValueError("Free Fire UID must contain only digits")
        if len(clean) < 6 or len(clean) > 15:
            raise ValueError("Free Fire UID must be between 6 and 15 digits long")
        return clean


class VerifyGamingIdentityRequest(BaseModel):
    status: GamingIdentityStatus  # VERIFIED or REJECTED
    rejection_reason: Optional[str] = None


class GamingIdentityResponse(BaseModel):
    id: str
    user_id: str
    game: str
    free_fire_uid: str
    nickname: str
    status: GamingIdentityStatus
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
