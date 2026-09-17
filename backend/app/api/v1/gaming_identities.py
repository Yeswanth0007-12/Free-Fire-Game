from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.gaming_identity import GamingIdentity, GamingIdentityStatus
from app.models.profile import PlayerProfile
from app.models.audit_log import AuditLog
from app.schemas.common import ApiResponse
from app.schemas.gaming_identity import (
    CreateGamingIdentityRequest,
    VerifyGamingIdentityRequest,
    GamingIdentityResponse,
)

router = APIRouter(prefix="/gaming-identities", tags=["Gaming Identities"])


@router.get("/me", response_model=ApiResponse[List[GamingIdentityResponse]])
async def get_my_gaming_identities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(GamingIdentity).where(GamingIdentity.user_id == current_user.id).order_by(GamingIdentity.created_at.desc())
    result = await db.execute(stmt)
    identities = result.scalars().all()
    return ApiResponse.ok(data=identities)


@router.post("", response_model=ApiResponse[GamingIdentityResponse], status_code=status.HTTP_201_CREATED)
async def link_gaming_identity(
    req: CreateGamingIdentityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate UID protection (Section 65)
    stmt = select(GamingIdentity).where(
        and_(
            GamingIdentity.free_fire_uid == req.free_fire_uid,
            GamingIdentity.game == "Free Fire",
            GamingIdentity.status.in_([GamingIdentityStatus.VERIFIED, GamingIdentityStatus.PENDING_VERIFICATION])
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        if existing.user_id == current_user.id:
            return ApiResponse.ok(data=existing, message="Gaming identity is already linked to your profile")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="FREE_FIRE_UID_ALREADY_LINKED: This Free Fire UID is already linked to another active player"
        )

    identity = GamingIdentity(
        user_id=current_user.id,
        game="Free Fire",
        free_fire_uid=req.free_fire_uid,
        nickname=req.nickname.strip(),
        status=GamingIdentityStatus.PENDING_VERIFICATION.value
    )
    db.add(identity)

    # Also synchronize player profile display values
    prof_stmt = select(PlayerProfile).where(PlayerProfile.user_id == current_user.id)
    prof_res = await db.execute(prof_stmt)
    profile = prof_res.scalar_one_or_none()
    if profile:
        profile.free_fire_uid = req.free_fire_uid
        profile.free_fire_name = req.nickname.strip()

    await db.commit()
    await db.refresh(identity)

    return ApiResponse.ok(data=identity, message="Free Fire identity submitted and pending verification")


@router.post("/{identity_id}/request-change", response_model=ApiResponse[GamingIdentityResponse])
async def request_uid_change(
    identity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(GamingIdentity).where(
        and_(GamingIdentity.id == identity_id, GamingIdentity.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    identity = result.scalar_one_or_none()
    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gaming identity not found")

    identity.status = GamingIdentityStatus.UID_CHANGE_REQUESTED.value
    await db.commit()
    await db.refresh(identity)

    return ApiResponse.ok(data=identity, message="UID change requested. A new verification process is required.")


# Admin routes for verification
admin_router = APIRouter(prefix="/admin/gaming-identities", tags=["Admin Gaming Identities"])


@admin_router.get("/pending", response_model=ApiResponse[List[GamingIdentityResponse]])
async def get_pending_identities(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(GamingIdentity).where(
        GamingIdentity.status.in_([
            GamingIdentityStatus.PENDING_VERIFICATION.value,
            GamingIdentityStatus.UID_CHANGE_REQUESTED.value
        ])
    ).order_by(GamingIdentity.created_at.asc())
    result = await db.execute(stmt)
    pending = result.scalars().all()
    return ApiResponse.ok(data=pending)


@admin_router.post("/{identity_id}/verify", response_model=ApiResponse[GamingIdentityResponse])
async def verify_gaming_identity(
    identity_id: str,
    req: VerifyGamingIdentityRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(GamingIdentity).where(GamingIdentity.id == identity_id)
    result = await db.execute(stmt)
    identity = result.scalar_one_or_none()
    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gaming identity not found")

    old_status = identity.status
    identity.status = req.status.value
    if req.status == GamingIdentityStatus.VERIFIED:
        identity.verified_at = datetime.now(timezone.utc)
        identity.verified_by = admin.id
        identity.rejection_reason = None
    else:
        identity.rejection_reason = req.rejection_reason

    # Audit log
    audit = AuditLog(
        admin_id=admin.id,
        action="VERIFY_GAMING_IDENTITY",
        target_type="GamingIdentity",
        target_id=identity.id,
        details={
            "old_status": old_status,
            "new_status": identity.status,
            "free_fire_uid": identity.free_fire_uid,
            "rejection_reason": req.rejection_reason
        }
    )
    db.add(audit)

    await db.commit()
    await db.refresh(identity)

    return ApiResponse.ok(data=identity, message=f"Gaming identity marked as {req.status.value}")
