from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.notification import Notification


class NotificationService:
    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: str,
        type: str,
        title: str,
        message: str,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[str] = None
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id
        )
        db.add(notif)
        await db.flush()
        return notif

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: str,
        limit: int = 50
    ) -> List[Notification]:
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def mark_read(db: AsyncSession, notification_id: str, user_id: str):
        stmt = (
            update(Notification)
            .where(Notification.id == notification_id, Notification.user_id == user_id)
            .values(is_read=True)
        )
        await db.execute(stmt)
        await db.flush()

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: str):
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id)
            .values(is_read=True)
        )
        await db.execute(stmt)
        await db.flush()
