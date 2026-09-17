import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy import select, and_, or_
from app.core.database import AsyncSessionLocal
from app.core.logging import logger
from app.models.match import Match, MatchStatus, RoomReleaseStatus, MatchHealthState
from app.models.slot import MatchSlot, SlotStatus
from app.models.registration import MatchRegistration, RegistrationStatus
from app.services.websocket_manager import ws_manager

# Telemetry for Admin Health Monitoring (Section 104, 135)
worker_telemetry: Dict[str, Any] = {
    "status": "STOPPED",
    "last_tick": None,
    "active_jobs": 0,
    "failed_jobs": 0,
    "stuck_matches": 0,
    "stale_reservations_cleared": 0,
    "rooms_released": 0,
    "error_message": None
}


async def run_match_lifecycle_worker():
    """
    Authoritative server-side match state transitions, timed room releases,
    stale reservation cleanup, and health telemetry tracker.
    """
    logger.info("Starting background match lifecycle and room release tracker...")
    worker_telemetry["status"] = "RUNNING"

    while True:
        try:
            worker_telemetry["active_jobs"] += 1
            now = datetime.now(timezone.utc)
            worker_telemetry["last_tick"] = now.isoformat()

            async with AsyncSessionLocal() as db:
                # 1. Release expired slot reservations (Section 14 & 27)
                exp_stmt = select(MatchRegistration).where(
                    and_(
                        MatchRegistration.status == RegistrationStatus.RESERVED.value,
                        MatchRegistration.reserved_until < now
                    )
                )
                expired_regs = list((await db.execute(exp_stmt)).scalars().all())
                for reg in expired_regs:
                    reg.status = RegistrationStatus.CANCELLED.value
                    reg.cancelled_at = now

                    # Decrement match players if applicable
                    m_stmt = select(Match).where(Match.id == reg.match_id)
                    match = (await db.execute(m_stmt)).scalar_one_or_none()
                    if match and match.status == MatchStatus.FULL.value:
                        match.status = MatchStatus.REGISTRATION_OPEN.value

                # Release corresponding MatchSlot records
                exp_slot_stmt = select(MatchSlot).where(
                    and_(
                        MatchSlot.status == SlotStatus.RESERVED.value,
                        MatchSlot.reserved_until < now
                    )
                )
                expired_slots = list((await db.execute(exp_slot_stmt)).scalars().all())
                for slot in expired_slots:
                    slot.status = SlotStatus.AVAILABLE.value
                    slot.registration_id = None
                    slot.reserved_until = None

                if expired_regs or expired_slots:
                    await db.commit()
                    count = max(len(expired_regs), len(expired_slots))
                    worker_telemetry["stale_reservations_cleared"] += count
                    logger.info(f"Released {count} expired slot reservations")

                # 2. Transition SCHEDULED -> REGISTRATION_OPEN
                stmt_open = select(Match).where(
                    and_(
                        Match.status == MatchStatus.SCHEDULED.value,
                        Match.registration_start_at <= now,
                        Match.registration_close_at > now
                    )
                )
                to_open = list((await db.execute(stmt_open)).scalars().all())
                for m in to_open:
                    m.status = MatchStatus.REGISTRATION_OPEN.value
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "REGISTRATION_OPEN"})

                # 3. Transition REGISTRATION_OPEN -> REGISTRATION_CLOSED
                stmt_close = select(Match).where(
                    and_(
                        Match.status.in_([MatchStatus.REGISTRATION_OPEN.value, MatchStatus.FULL.value]),
                        Match.registration_close_at <= now,
                        Match.room_release_at > now
                    )
                )
                to_close = list((await db.execute(stmt_close)).scalars().all())
                for m in to_close:
                    m.status = MatchStatus.REGISTRATION_CLOSED.value
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "REGISTRATION_CLOSED"})

                # 4. Authoritative Timed Room Release (Section 23, 27, 73)
                stmt_release = select(Match).where(
                    and_(
                        Match.room_release_at <= now,
                        Match.room_id_encrypted.isnot(None),
                        Match.room_release_status != RoomReleaseStatus.RELEASED.value
                    )
                )
                to_release = list((await db.execute(stmt_release)).scalars().all())
                for m in to_release:
                    m.room_release_status = RoomReleaseStatus.RELEASED.value
                    worker_telemetry["rooms_released"] += 1
                    logger.info(f"Timed room release executed for match {m.public_match_code}")
                    await ws_manager.broadcast_match_event(m.id, "ROOM_RELEASED", {
                        "match_id": m.id,
                        "public_match_code": m.public_match_code,
                        "message": "Room credentials released. Join the custom room in Free Fire immediately."
                    })

                # 5. Transition REGISTRATION_CLOSED -> ROOM_READY
                stmt_room = select(Match).where(
                    and_(
                        Match.status == MatchStatus.REGISTRATION_CLOSED.value,
                        Match.room_release_at <= now,
                        Match.match_start_at > now
                    )
                )
                to_room = list((await db.execute(stmt_room)).scalars().all())
                for m in to_room:
                    m.status = MatchStatus.ROOM_READY.value
                    await ws_manager.broadcast_match_event(m.id, "ROOM_READY", {"status": "ROOM_READY", "match_id": m.id})

                # 6. Transition ROOM_READY -> IN_PROGRESS
                stmt_start = select(Match).where(
                    and_(
                        Match.status == MatchStatus.ROOM_READY.value,
                        Match.match_start_at <= now
                    )
                )
                to_start = list((await db.execute(stmt_start)).scalars().all())
                for m in to_start:
                    m.status = MatchStatus.IN_PROGRESS.value
                    await ws_manager.broadcast_match_event(m.id, "STATUS_CHANGED", {"status": "IN_PROGRESS"})

                # 7. Stale Match & Health State Evaluation (Section 105 & 106)
                stuck_stmt = select(Match).where(
                    and_(
                        Match.status.in_([MatchStatus.SCHEDULED.value, MatchStatus.REGISTRATION_OPEN.value]),
                        Match.match_start_at < (now - timedelta(minutes=15))
                    )
                )
                stuck_matches = list((await db.execute(stuck_stmt)).scalars().all())
                worker_telemetry["stuck_matches"] = len(stuck_matches)
                for sm in stuck_matches:
                    sm.health_state = MatchHealthState.ACTION_REQUIRED.value

                # Check missing room credentials 5 minutes before release
                missing_room_stmt = select(Match).where(
                    and_(
                        Match.room_release_at <= (now + timedelta(minutes=5)),
                        Match.room_release_at > now,
                        Match.room_id_encrypted.is_(None)
                    )
                )
                missing_rooms = list((await db.execute(missing_room_stmt)).scalars().all())
                for mr in missing_rooms:
                    mr.health_state = MatchHealthState.ACTION_REQUIRED.value

                await db.commit()

        except Exception as e:
            worker_telemetry["failed_jobs"] += 1
            worker_telemetry["error_message"] = str(e)
            logger.error(f"Error in match lifecycle worker: {e}")

        await asyncio.sleep(10)
