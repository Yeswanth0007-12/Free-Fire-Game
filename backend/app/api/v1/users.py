from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.profile import PlayerProfile
from app.schemas.common import ApiResponse
from app.schemas.user import UserResponse, PlayerProfileResponse, UpdateProfileRequest

router = APIRouter(prefix="", tags=["Users"])


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PlayerProfile).where(PlayerProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    prof_data = None
    if profile:
        prof_data = PlayerProfileResponse.model_validate(profile)

    user_data = UserResponse(
        id=current_user.id,
        email=current_user.email,
        phone=current_user.phone,
        role=current_user.role,
        status=current_user.status,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        profile=prof_data
    )
    return ApiResponse.ok(data=user_data)


@router.patch("/me/profile", response_model=ApiResponse[PlayerProfileResponse])
async def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PlayerProfile).where(PlayerProfile.user_id == current_user.id)
    profile = (await db.execute(stmt)).scalar_one_or_none()

    if req.display_name:
        profile.display_name = req.display_name.strip()
    if req.avatar_url:
        profile.avatar_url = req.avatar_url.strip()
    if req.free_fire_name:
        profile.free_fire_name = req.free_fire_name.strip()
    if req.free_fire_uid:
        profile.free_fire_uid = req.free_fire_uid.strip()

    await db.flush()
    return ApiResponse.ok(data=PlayerProfileResponse.model_validate(profile), message="Profile updated successfully")
