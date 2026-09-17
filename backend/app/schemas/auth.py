from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=2, max_length=50)
    free_fire_uid: str = Field(min_length=5, max_length=30)
    free_fire_name: str = Field(min_length=2, max_length=50)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class FirebaseAuthRequest(BaseModel):
    id_token: str
    provider: Optional[str] = "google.com"  # "google.com" or "facebook.com"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
