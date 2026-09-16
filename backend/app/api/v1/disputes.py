from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.dispute import DisputeStatus
from app.schemas.common import ApiResponse
from app.schemas.dispute import CreateDisputeRequest, ResolveDisputeRequest, DisputeResponse
from app.services.dispute_service import DisputeService

router = APIRouter(prefix="", tags=["Disputes"])


@router.post("/disputes", response_model=ApiResponse[DisputeResponse])
async def create_dispute(
    req: CreateDisputeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    dispute = await DisputeService.create_dispute(db, current_user.id, req)
    return ApiResponse.ok(data=DisputeResponse.model_validate(dispute), message="Dispute filed successfully")


@router.get("/disputes", response_model=ApiResponse[List[DisputeResponse]])
async def get_my_disputes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    disputes = await DisputeService.get_user_disputes(db, current_user.id)
    return ApiResponse.ok(data=[DisputeResponse.model_validate(d) for d in disputes])


@router.get("/admin/disputes", response_model=ApiResponse[List[DisputeResponse]])
async def list_all_disputes(
    status: Optional[DisputeStatus] = Query(None),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    disputes = await DisputeService.get_all_disputes(db, status)
    return ApiResponse.ok(data=[DisputeResponse.model_validate(d) for d in disputes])


@router.post("/admin/disputes/{dispute_id}/resolve", response_model=ApiResponse[DisputeResponse])
async def resolve_dispute(
    dispute_id: str,
    req: ResolveDisputeRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    dispute = await DisputeService.resolve_dispute(db, dispute_id, current_user.id, req)
    return ApiResponse.ok(data=DisputeResponse.model_validate(dispute), message="Dispute resolved")
