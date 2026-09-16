from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.user import User, UserStatus
from app.models.match import Match, MatchStatus
from app.models.profile import PlayerProfile
from app.schemas.common import ApiResponse
from app.schemas.admin import (
    AdminDashboardStats,
    AuditLogResponse,
    RiskFlagResponse,
    UpdateUserStatusRequest
)
from app.schemas.match import MatchCreateRequest, MatchUpdateRequest, MatchResponse
from app.schemas.wallet import AdminAdjustmentRequest, WalletTransactionResponse
from app.schemas.user import UserResponse, PlayerProfileResponse
from app.services.admin_service import AdminService
from app.services.match_service import MatchService
from app.services.wallet_service import WalletService
from app.core.exceptions import EntityNotFoundException

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=ApiResponse[AdminDashboardStats])
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stats = await AdminService.get_dashboard_stats(db)
    return ApiResponse.ok(data=stats)


@router.post("/matches", response_model=ApiResponse[MatchResponse], status_code=status.HTTP_201_CREATED)
async def create_match(
    req: MatchCreateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    match = await MatchService.create_match(db, req, host_id=current_user.id)
    await AdminService.log_action(
        db=db,
        actor_user_id=current_user.id,
        action="ADMIN_CREATED_MATCH",
        target_entity_type="MATCH",
        target_entity_id=match.id,
        after_state={"public_code": match.public_match_code, "prize_pool": match.prize_pool_minor}
    )
    return ApiResponse.ok(data=MatchResponse.model_validate(match), message="Match scheduled successfully")


@router.patch("/matches/{match_id}", response_model=ApiResponse[MatchResponse])
async def update_match(
    match_id: str,
    req: MatchUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Match).where(Match.id == match_id).with_for_update()
    match = (await db.execute(stmt)).scalar_one_or_none()
    if not match:
        raise EntityNotFoundException("Match", match_id)

    if req.map_name:
        match.map_name = req.map_name
    if req.registration_close_at:
        match.registration_close_at = req.registration_close_at
    if req.match_start_at:
        match.match_start_at = req.match_start_at
    if req.room_release_at:
        match.room_release_at = req.room_release_at
    if req.rules_text:
        match.rules_text = req.rules_text
    if req.status:
        match.status = req.status

    await db.flush()
    await AdminService.log_action(
        db=db,
        actor_user_id=current_user.id,
        action="ADMIN_UPDATED_MATCH",
        target_entity_type="MATCH",
        target_entity_id=match.id
    )
    return ApiResponse.ok(data=MatchResponse.model_validate(match), message="Match updated successfully")


@router.post("/matches/{match_id}/cancel", response_model=ApiResponse[MatchResponse])
async def cancel_match(
    match_id: str,
    reason: Optional[str] = "Cancelled by admin",
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    match = await MatchService.cancel_match(db, match_id, current_user.id, reason=reason or "Admin action")
    await AdminService.log_action(
        db=db,
        actor_user_id=current_user.id,
        action="ADMIN_CANCELLED_MATCH",
        target_entity_type="MATCH",
        target_entity_id=match.id,
        after_state={"reason": reason}
    )
    return ApiResponse.ok(data=MatchResponse.model_validate(match), message="Match cancelled and refunds issued")


@router.get("/users", response_model=ApiResponse[List[UserResponse]])
async def list_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    users = list((await db.execute(stmt)).scalars().all())

    user_list = []
    for u in users:
        p_stmt = select(PlayerProfile).where(PlayerProfile.user_id == u.id)
        p = (await db.execute(p_stmt)).scalar_one_or_none()
        user_list.append(
            UserResponse(
                id=u.id,
                email=u.email,
                phone=u.phone,
                role=u.role,
                status=u.status,
                is_verified=u.is_verified,
                created_at=u.created_at,
                profile=PlayerProfileResponse.model_validate(p) if p else None
            )
        )
    return ApiResponse.ok(data=user_list)


@router.patch("/users/{user_id}/status", response_model=ApiResponse[bool])
async def update_user_status(
    user_id: str,
    req: UpdateUserStatusRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id).with_for_update()
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise EntityNotFoundException("User", user_id)

    before_status = user.status.value
    user.status = req.status
    await db.flush()

    await AdminService.log_action(
        db=db,
        actor_user_id=current_user.id,
        action="ADMIN_UPDATED_USER_STATUS",
        target_entity_type="USER",
        target_entity_id=user.id,
        before_state={"status": before_status},
        after_state={"status": req.status.value, "reason": req.reason}
    )
    return ApiResponse.ok(data=True, message=f"User status updated to {req.status.value}")


@router.post("/wallet/adjust", response_model=ApiResponse[WalletTransactionResponse])
async def admin_wallet_adjustment(
    req: AdminAdjustmentRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    adjustment_id = str(uuid.uuid4())
    tx = await WalletService.post_transaction(
        db=db,
        user_id=req.user_id,
        type="ADJUSTMENT",
        amount_minor=req.amount_minor,
        direction=req.direction,
        reference_type="ADMIN_ADJUSTMENT",
        reference_id=adjustment_id,
        idempotency_key=f"ADMIN_ADJUST:{adjustment_id}",
        description=f"Admin adjustment: {req.reason}"
    )

    await AdminService.log_action(
        db=db,
        actor_user_id=current_user.id,
        action="ADMIN_ADJUSTED_WALLET",
        target_entity_type="WALLET",
        target_entity_id=tx.wallet_id,
        after_state={"amount_minor": req.amount_minor, "direction": req.direction.value, "reason": req.reason}
    )
    return ApiResponse.ok(data=WalletTransactionResponse.model_validate(tx), message="Wallet adjustment applied")


@router.get("/audit-logs", response_model=ApiResponse[List[AuditLogResponse]])
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    logs = await AdminService.get_audit_logs(db, limit=limit, offset=offset)
    return ApiResponse.ok(data=[AuditLogResponse.model_validate(l) for l in logs])


@router.get("/risk-flags", response_model=ApiResponse[List[RiskFlagResponse]])
async def list_risk_flags(
    resolved: Optional[bool] = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    flags = await AdminService.get_risk_flags(db, resolved=resolved)
    return ApiResponse.ok(data=[RiskFlagResponse.model_validate(f) for f in flags])
