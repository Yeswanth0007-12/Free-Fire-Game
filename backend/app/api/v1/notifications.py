from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=ApiResponse[List[NotificationResponse]])
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    notifs = await NotificationService.get_user_notifications(db, current_user.id, limit=limit)
    return ApiResponse.ok(data=[NotificationResponse.model_validate(n) for n in notifs])


@router.post("/{notification_id}/read", response_model=ApiResponse[bool])
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await NotificationService.mark_read(db, notification_id, current_user.id)
    return ApiResponse.ok(data=True, message="Marked as read")


@router.post("/read-all", response_model=ApiResponse[bool])
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await NotificationService.mark_all_read(db, current_user.id)
    return ApiResponse.ok(data=True, message="All notifications marked as read")
