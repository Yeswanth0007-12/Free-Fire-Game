import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, and_, or_
from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.match import Match, MatchStatus
from app.models.registration import MatchRegistration, RegistrationStatus
from app.services.websocket_manager import ws_manager


async def run_match_lifecycle_worker():
    """
    Periodic background loop ensuring authoritative server-side match state transitions
    and expired slot reservation release.
    """
    logger.info("Starting background match lifecycle worker...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)

                # 1. Release expired slot reservations (5 min timeout)
                exp_stmt = select(MatchRegistration).where(
                    and_(
                        MatchRegistration.status == RegistrationStatus.RESERVED,
                        MatchRegistration.reserved_until < now
                    )
                )
                expired_regs = list((await db.execute(exp_stmt)).scalars().all())
                for reg in expired_regs:
                    reg.status = RegistrationStatus.CANCELLED
                    # Decrement slot if it was reserved
                    m_stmt = select(Match).where(Match.id == reg.match_id)
                    match = (await db.execute(m_stmt)).scalar_one_or_none()
                    if match and match.status == MatchStatus.FULL:
                        match.status = MatchStatus.REGISTRATION_OPEN
                if expired_regs:
                    await db.commit()
                    logger.info(f"Released {len(expired_regs)} expired slot reservations")

                # 2. Transition SCHEDULED -> REGISTRATION_OPEN
                stmt_open = select(Match).where(
                    and_(
                        Match.status == MatchStatus.SCHEDULED,
                        Match.registration_start_at <= now,
                        Match.registration_close_at > now
                    )
                )
                to_open = list((await db.execute(stmt_open)).scalars().all())
                for m in to_open:
                    m.status = MatchStatus.REGISTRATION_OPEN
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "REGISTRATION_OPEN"})

                # 3. Transition REGISTRATION_OPEN -> REGISTRATION_CLOSED
                stmt_close = select(Match).where(
                    and_(
                        Match.status.in_([MatchStatus.REGISTRATION_OPEN, MatchStatus.FULL]),
                        Match.registration_close_at <= now,
                        Match.room_release_at > now
                    )
                )
                to_close = list((await db.execute(stmt_close)).scalars().all())
                for m in to_close:
                    m.status = MatchStatus.REGISTRATION_CLOSED
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "REGISTRATION_CLOSED"})

                # 4. Transition REGISTRATION_CLOSED -> ROOM_READY
                stmt_room = select(Match).where(
                    and_(
                        Match.status == MatchStatus.REGISTRATION_CLOSED,
                        Match.room_release_at <= now,
                        Match.match_start_at > now
                    )
                )
                to_room = list((await db.execute(stmt_room)).scalars().all())
                for m in to_room:
                    m.status = MatchStatus.ROOM_READY
                    await ws_manager.broadcast_match_event(m.id, "ROOM_READY", {"status": "ROOM_READY", "match_id": m.id})

                # 5. Transition ROOM_READY -> IN_PROGRESS
                stmt_start = select(Match).where(
                    and_(
                        Match.status == MatchStatus.ROOM_READY,
                        Match.match_start_at <= now
                    )
                )
                to_start = list((await db.execute(stmt_start)).scalars().all())
                for m in to_start:
                    m.status = MatchStatus.IN_PROGRESS
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "IN_PROGRESS"})

                await db.commit()

        except Exception as e:
            logger.error(f"Error in match lifecycle worker: {e}")

        await asyncio.sleep(10)  # Check every 10 seconds
