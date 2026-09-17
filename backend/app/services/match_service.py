import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from app.core.exceptions import (
    EntityNotFoundException,
    MatchFullException,
    RegistrationClosedException,
    AlreadyRegisteredException,
    RoomLockedException,
    InvalidStateTransitionException
)
from fastapi import HTTPException, status
from app.core.security import encrypt_room_credential, decrypt_room_credential
from app.models.match import Match, MatchStatus, ResultStatus, SettlementStatus, TeamAssignmentMode, RoomReleaseStatus, MatchHealthState
from app.models.slot import MatchSlot, SlotStatus
from app.models.gaming_identity import GamingIdentity, GamingIdentityStatus
from app.models.game import Game, GameMode
from app.models.registration import MatchRegistration, RegistrationStatus
from app.models.team import Team, TeamMember
from app.models.profile import PlayerProfile
from app.models.wallet import TransactionType, TransactionDirection
from app.schemas.match import (
    MatchCreateRequest,
    MatchUpdateRequest,
    MatchFilterParams,
    RoomCredentialsResponse,
    SlotResponse,
    SlotJoinRequest,
    MatchSlotsSummaryResponse
)
from app.services.wallet_service import WalletService


def generate_match_code() -> str:
    chars = string.ascii_uppercase + string.digits
    rand = "".join(random.choices(chars, k=5))
    return f"FF-{rand}"


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class MatchService:
    @staticmethod
    async def create_match(db: AsyncSession, req: MatchCreateRequest, host_id: Optional[str] = None) -> Match:
        # Verify game mode
        stmt = select(GameMode).where(GameMode.id == req.mode_id)
        mode = (await db.execute(stmt)).scalar_one_or_none()
        if not mode:
            raise EntityNotFoundException("GameMode", req.mode_id)

        # Encrypt room credentials if provided
        enc_room_id = encrypt_room_credential(req.room_id) if req.room_id else None
        enc_room_pass = encrypt_room_credential(req.room_password) if req.room_password else None

        reg_start = ensure_utc(req.registration_start_at)
        reg_close = ensure_utc(req.registration_close_at)
        now = datetime.now(timezone.utc)
        initial_status = MatchStatus.SCHEDULED
        if reg_start and reg_close and reg_start <= now < reg_close:
            initial_status = MatchStatus.REGISTRATION_OPEN

        match = Match(
            public_match_code=generate_match_code(),
            game_id=req.game_id,
            mode_id=req.mode_id,
            map_name=req.map_name,
            match_format=req.match_format,
            entry_fee_minor=req.entry_fee_minor,
            prize_pool_minor=req.prize_pool_minor,
            currency=req.currency,
            prize_distribution=req.prize_distribution,
            max_players=req.max_players,
            current_players=0,
            max_teams=req.max_teams,
            registration_start_at=reg_start,
            registration_close_at=reg_close,
            match_start_at=ensure_utc(req.match_start_at),
            result_deadline_at=ensure_utc(req.result_deadline_at),
            room_release_at=ensure_utc(req.room_release_at),
            room_id_encrypted=enc_room_id,
            room_password_encrypted=enc_room_pass,
            host_id=host_id,
            team_assignment_mode=req.team_assignment_mode.value if hasattr(req.team_assignment_mode, "value") else str(req.team_assignment_mode),
            status=initial_status.value if hasattr(initial_status, "value") else str(initial_status),
            result_status=ResultStatus.PENDING.value if hasattr(ResultStatus.PENDING, "value") else str(ResultStatus.PENDING),
            settlement_status=SettlementStatus.UNSETTLED.value if hasattr(SettlementStatus.UNSETTLED, "value") else str(SettlementStatus.UNSETTLED),
            rules_text=req.rules_text or "Standard Free Fire Competitive Tournament Rules apply. No cheating or unauthorized software."
        )
        match.mode = mode
        db.add(match)
        await db.flush()

        # Initialize default teams if mode requires teams
        teams_list = []
        if mode.requires_teams and req.max_teams > 0:
            for i in range(1, req.max_teams + 1):
                team_name = f"Team {'Alpha' if i == 1 else 'Bravo' if i == 2 else f'Squad {i}'}"
                team = Team(
                    match_id=match.id,
                    name=team_name,
                    slot_number=i,
                    status="ACTIVE"
                )
                db.add(team)
                teams_list.append(team)
            await db.flush()

        # Initialize explicit MatchSlots (Section 54)
        slots_per_team = req.max_players // max(len(teams_list), 1) if teams_list else req.max_players
        for slot_idx in range(1, req.max_players + 1):
            assigned_team_id = None
            if teams_list:
                team_idx = min((slot_idx - 1) // max(slots_per_team, 1), len(teams_list) - 1)
                assigned_team_id = teams_list[team_idx].id
            slot = MatchSlot(
                match_id=match.id,
                slot_number=slot_idx,
                team_id=assigned_team_id,
                status=SlotStatus.AVAILABLE.value
            )
            db.add(slot)
        await db.flush()

        # Broadcast MATCH_CREATED event
        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_global("MATCH_CREATED", {
            "match_id": match.id,
            "public_match_code": match.public_match_code,
            "mode": mode.name,
            "entry_fee_minor": match.entry_fee_minor,
            "prize_pool_minor": match.prize_pool_minor,
            "match_start_at": match.match_start_at.isoformat() if match.match_start_at else None
        })

        return match

    @staticmethod
    async def get_matches(
        db: AsyncSession,
        params: MatchFilterParams,
        current_user_id: Optional[str] = None
    ) -> List[Tuple[Match, bool]]:
        stmt = select(Match)

        if params.mode:
            stmt = stmt.join(Match.mode).where(GameMode.slug == params.mode)
        if params.format:
            fmt = params.format.strip().lower()
            stmt = stmt.where(or_(
                func.lower(Match.match_format) == fmt,
                Match.match_format.ilike(f"%{fmt}%")
            ))
        if params.status:
            st = params.status.value if hasattr(params.status, "value") else str(params.status)
            stmt = stmt.where(Match.status == st)
        if params.min_entry_fee is not None:
            stmt = stmt.where(Match.entry_fee_minor >= params.min_entry_fee)
        if params.max_entry_fee is not None:
            stmt = stmt.where(Match.entry_fee_minor <= params.max_entry_fee)

        stmt = stmt.order_by(Match.match_start_at.asc()).limit(params.limit).offset(params.offset)
        result = await db.execute(stmt)
        matches = list(result.scalars().all())

        # Check registered status
        registered_match_ids = set()
        if current_user_id and matches:
            match_ids = [m.id for m in matches]
            reg_stmt = select(MatchRegistration.match_id).where(
                and_(
                    MatchRegistration.match_id.in_(match_ids),
                    MatchRegistration.user_id == current_user_id,
                    MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
                )
            )
            reg_result = await db.execute(reg_stmt)
            registered_match_ids = set(reg_result.scalars().all())

        return [(m, m.id in registered_match_ids) for m in matches]

    @staticmethod
    async def get_match_detail(
        db: AsyncSession,
        match_id: str,
        current_user_id: Optional[str] = None
    ) -> Tuple[Match, bool]:
        stmt = select(Match).where(Match.id == match_id)
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        is_registered = False
        if current_user_id:
            reg_stmt = select(MatchRegistration).where(
                and_(
                    MatchRegistration.match_id == match_id,
                    MatchRegistration.user_id == current_user_id,
                    MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
                )
            )
            reg = (await db.execute(reg_stmt)).scalar_one_or_none()
            is_registered = reg is not None

        return match, is_registered

    @staticmethod
    async def get_room_credentials(
        db: AsyncSession,
        match_id: str,
        current_user_id: str
    ) -> RoomCredentialsResponse:
        stmt = select(Match).where(Match.id == match_id)
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        # Check if user is registered with CONFIRMED status
        reg_stmt = select(MatchRegistration).where(
            and_(
                MatchRegistration.match_id == match_id,
                MatchRegistration.user_id == current_user_id,
                MatchRegistration.status == RegistrationStatus.CONFIRMED
            )
        )
        reg = (await db.execute(reg_stmt)).scalar_one_or_none()
        if not reg:
            raise RoomLockedException("Only confirmed players registered for this match can access room credentials.")

        now = datetime.now(timezone.utc)
        # Handle timezone comparison safely
        release_at = match.room_release_at
        if release_at.tzinfo is None:
            release_at = release_at.replace(tzinfo=timezone.utc)

        if now < release_at:
            raise RoomLockedException(release_at.strftime("%Y-%m-%d %H:%M:%S UTC"))

        decrypted_room_id = decrypt_room_credential(match.room_id_encrypted)
        decrypted_password = decrypt_room_credential(match.room_password_encrypted)

        return RoomCredentialsResponse(
            match_id=match.id,
            public_match_code=match.public_match_code,
            room_id=decrypted_room_id,
            room_password=decrypted_password,
            is_released=True,
            release_time=release_at,
            message="Room credentials released. Join the custom room in Free Fire immediately."
        )

    @staticmethod
    async def join_match(
        db: AsyncSession,
        match_id: str,
        user_id: str,
        payment_method: str = "WALLET"
    ) -> MatchRegistration:
        # 1. Verify player profile & FF UID
        prof_stmt = select(PlayerProfile).where(PlayerProfile.user_id == user_id)
        profile = (await db.execute(prof_stmt)).scalar_one_or_none()
        if not profile or not profile.free_fire_uid:
            raise EntityNotFoundException("PlayerProfile with linked Free Fire UID", user_id)

        # 2. Concurrency Lock: SELECT FOR UPDATE on match row
        match_stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(match_stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        # 3. Lifecycle & Timing checks
        now = datetime.now(timezone.utc)
        close_at = match.registration_close_at
        if close_at.tzinfo is None:
            close_at = close_at.replace(tzinfo=timezone.utc)

        if match.status == MatchStatus.FULL or match.current_players >= match.max_players:
            raise MatchFullException("Match capacity reached")

        if now >= close_at:
            raise RegistrationClosedException("Registration deadline has passed")

        if match.status not in (MatchStatus.REGISTRATION_OPEN, MatchStatus.SCHEDULED):
            raise RegistrationClosedException(f"Match status is {match.status.value}")

        # 4. Check already registered
        existing_stmt = select(MatchRegistration).where(
            and_(
                MatchRegistration.match_id == match_id,
                MatchRegistration.user_id == user_id,
                MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
            )
        )
        existing = (await db.execute(existing_stmt)).scalar_one_or_none()
        if existing:
            raise AlreadyRegisteredException("You are already registered for this match")

        # 5. Check Capacity
        if match.current_players >= match.max_players:
            match.status = MatchStatus.FULL
            await db.flush()
            raise MatchFullException("Match capacity reached")

        # 6. Assign next slot number
        slot_number = match.current_players + 1

        # 7. Process payment / registration confirmation
        if payment_method == "WALLET":
            if match.entry_fee_minor > 0:
                await WalletService.post_transaction(
                    db=db,
                    user_id=user_id,
                    type=TransactionType.ENTRY_FEE,
                    amount_minor=match.entry_fee_minor,
                    direction=TransactionDirection.DEBIT,
                    reference_type="MATCH",
                    reference_id=match.id,
                    idempotency_key=f"MATCH_ENTRY:{match.id}:{user_id}",
                    description=f"Entry fee for match {match.public_match_code}"
                )

            # Create confirmed registration
            reg = MatchRegistration(
                match_id=match.id,
                user_id=user_id,
                status=RegistrationStatus.CONFIRMED,
                slot_number=slot_number,
                entry_fee_minor=match.entry_fee_minor
            )
            db.add(reg)
            await db.flush()

            # Update match slots
            match.current_players += 1
            if match.current_players >= match.max_players:
                match.status = MatchStatus.FULL
            await db.flush()

            # Auto-assign team if teams exist
            await MatchService._assign_team(db, match, reg, user_id)

            return reg
        else:
            # Payment provider checkout flow (slot reserved for 5 minutes)
            reserved_until = now + timedelta(minutes=5)
            reg = MatchRegistration(
                match_id=match.id,
                user_id=user_id,
                status=RegistrationStatus.RESERVED,
                slot_number=slot_number,
                reserved_until=reserved_until,
                entry_fee_minor=match.entry_fee_minor
            )
            db.add(reg)
            await db.flush()
            return reg

    @staticmethod
    async def _assign_team(db: AsyncSession, match: Match, reg: MatchRegistration, user_id: str):
        # Fetch teams for this match
        team_stmt = select(Team).where(Team.match_id == match.id).order_by(Team.slot_number.asc())
        teams = list((await db.execute(team_stmt)).scalars().all())
        if not teams:
            return

        # Find team with fewest members
        least_members_team = None
        min_count = 999
        for team in teams:
            count_stmt = select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id)
            member_count = (await db.execute(count_stmt)).scalar() or 0
            if member_count < min_count:
                min_count = member_count
                least_members_team = team

        if least_members_team:
            reg.team_id = least_members_team.id
            team_member = TeamMember(
                team_id=least_members_team.id,
                registration_id=reg.id,
                user_id=user_id
            )
            db.add(team_member)
            await db.flush()

    @staticmethod
    async def cancel_match(db: AsyncSession, match_id: str, admin_user_id: str, reason: str) -> Match:
        stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        if match.status in (MatchStatus.COMPLETED, MatchStatus.SETTLED):
            raise InvalidStateTransitionException(match.status.value, MatchStatus.CANCELLED.value)

        match.status = MatchStatus.CANCELLED
        await db.flush()

        # Refund all confirmed players
        reg_stmt = select(MatchRegistration).where(
            and_(
                MatchRegistration.match_id == match_id,
                MatchRegistration.status == RegistrationStatus.CONFIRMED
            )
        )
        registrations = list((await db.execute(reg_stmt)).scalars().all())

        for r in registrations:
            if r.entry_fee_minor > 0:
                await WalletService.post_transaction(
                    db=db,
                    user_id=r.user_id,
                    type=TransactionType.REFUND,
                    amount_minor=r.entry_fee_minor,
                    direction=TransactionDirection.CREDIT,
                    reference_type="MATCH",
                    reference_id=match.id,
                    idempotency_key=f"REFUND:{match.id}:{r.user_id}",
                    description=f"Refund for cancelled match {match.public_match_code} ({reason})"
                )
            r.status = RegistrationStatus.REFUNDED

        await db.flush()
        return match

    @staticmethod
    async def get_match_slots(db: AsyncSession, match_id: str, current_user_id: Optional[str] = None) -> MatchSlotsSummaryResponse:
        now = datetime.now(timezone.utc)
        
        # Auto-release expired reservations (Section 14 & 27)
        expired_stmt = select(MatchSlot).where(
            and_(
                MatchSlot.match_id == match_id,
                MatchSlot.status == SlotStatus.RESERVED.value,
                MatchSlot.reserved_until < now
            )
        )
        expired_slots = list((await db.execute(expired_stmt)).scalars().all())
        for exp_slot in expired_slots:
            exp_slot.status = SlotStatus.AVAILABLE.value
            exp_slot.registration_id = None
            exp_slot.reserved_until = None
        if expired_slots:
            await db.flush()

        stmt = select(MatchSlot).where(MatchSlot.match_id == match_id).order_by(MatchSlot.slot_number.asc())
        slots = list((await db.execute(stmt)).scalars().all())

        # Check which slot is owned by current user
        my_reg_ids = set()
        if current_user_id:
            my_reg_stmt = select(MatchRegistration.id).where(
                and_(
                    MatchRegistration.match_id == match_id,
                    MatchRegistration.user_id == current_user_id,
                    MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
                )
            )
            my_reg_ids = set((await db.execute(my_reg_stmt)).scalars().all())

        slot_responses = []
        avail = 0
        res = 0
        conf = 0
        for s in slots:
            is_mine = s.registration_id in my_reg_ids if s.registration_id else False
            if s.status == SlotStatus.AVAILABLE.value:
                avail += 1
            elif s.status == SlotStatus.RESERVED.value:
                res += 1
            elif s.status == SlotStatus.CONFIRMED.value:
                conf += 1

            slot_responses.append(SlotResponse(
                id=s.id,
                slot_number=s.slot_number,
                team_id=s.team_id,
                status=s.status,
                is_my_slot=is_mine,
                reserved_until=s.reserved_until,
                confirmed_at=s.confirmed_at
            ))

        return MatchSlotsSummaryResponse(
            match_id=match_id,
            max_slots=len(slots),
            available_slots=avail,
            reserved_slots=res,
            confirmed_slots=conf,
            slots=slot_responses
        )

    @staticmethod
    async def reserve_slot(
        db: AsyncSession,
        match_id: str,
        user_id: str,
        slot_number: int,
        gaming_identity_id: Optional[str] = None
    ) -> Tuple[MatchRegistration, Optional[Dict[str, Any]]]:
        # 1. Verify player has a verified gaming identity (Section 11)
        identity = None
        if gaming_identity_id:
            ident_stmt = select(GamingIdentity).where(
                and_(
                    GamingIdentity.id == gaming_identity_id,
                    GamingIdentity.user_id == user_id,
                    GamingIdentity.status == GamingIdentityStatus.VERIFIED.value
                )
            )
            identity = (await db.execute(ident_stmt)).scalar_one_or_none()
        else:
            ident_stmt = select(GamingIdentity).where(
                and_(
                    GamingIdentity.user_id == user_id,
                    GamingIdentity.status == GamingIdentityStatus.VERIFIED.value
                )
            ).order_by(GamingIdentity.created_at.desc())
            identity = (await db.execute(ident_stmt)).scalar_one_or_none()

        if not identity:
            # Check user profile fallback for backward compatibility & seed accounts
            prof_stmt = select(PlayerProfile).where(PlayerProfile.user_id == user_id)
            profile = (await db.execute(prof_stmt)).scalar_one_or_none()
            if not profile or not profile.free_fire_uid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Verify your Free Fire identity before joining paid matches."
                )

        # 2. Concurrency Lock: Lock match row and slot row (Section 13)
        match_stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(match_stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        now = datetime.now(timezone.utc)
        close_at = match.registration_close_at
        if close_at.tzinfo is None:
            close_at = close_at.replace(tzinfo=timezone.utc)
        if now >= close_at:
            raise RegistrationClosedException("Registration deadline has passed")
        if match.status not in (MatchStatus.REGISTRATION_OPEN, MatchStatus.SCHEDULED):
            raise RegistrationClosedException(f"Match status is {match.status}")

        # Check user isn't already registered
        existing_stmt = select(MatchRegistration).where(
            and_(
                MatchRegistration.match_id == match_id,
                MatchRegistration.user_id == user_id,
                MatchRegistration.status.in_([RegistrationStatus.CONFIRMED, RegistrationStatus.RESERVED])
            )
        )
        if (await db.execute(existing_stmt)).scalar_one_or_none():
            raise AlreadyRegisteredException("You are already registered for this match")

        # Lock specific slot row
        slot_stmt = select(MatchSlot).where(
            and_(
                MatchSlot.match_id == match_id,
                MatchSlot.slot_number == slot_number
            )
        ).with_for_update()
        slot = (await db.execute(slot_stmt)).scalar_one_or_none()
        if not slot:
            raise EntityNotFoundException(f"Slot {slot_number} in Match", match_id)

        # Check availability
        is_available = slot.status == SlotStatus.AVAILABLE.value or (
            slot.status == SlotStatus.RESERVED.value and slot.reserved_until and slot.reserved_until < now
        )
        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SLOT NO LONGER AVAILABLE."
            )

        # 3. Reserve slot for 5 minutes (Section 14)
        reserved_until = now + timedelta(minutes=5)
        reg = MatchRegistration(
            match_id=match.id,
            user_id=user_id,
            gaming_identity_id=identity.id if identity else None,
            slot_number=slot_number,
            team_id=slot.team_id,
            status=RegistrationStatus.RESERVED.value,
            reserved_until=reserved_until,
            entry_fee_minor=match.entry_fee_minor,
            registration_source="MOBILE_APP"
        )
        
        from sqlalchemy.exc import IntegrityError
        try:
            db.add(reg)
            await db.flush()

            slot.status = SlotStatus.RESERVED.value
            slot.registration_id = reg.id
            slot.reserved_until = reserved_until
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="SLOT NO LONGER AVAILABLE."
            )

        # Auto-assign team member if team is assigned
        if slot.team_id:
            tm = TeamMember(
                team_id=slot.team_id,
                registration_id=reg.id,
                user_id=user_id
            )
            db.add(tm)
            await db.flush()

        # 4. Create Razorpay order if entry fee > 0 (Section 16)
        razorpay_order = None
        if match.entry_fee_minor > 0:
            from app.services.payment_service import PaymentService
            razorpay_order = await PaymentService.create_razorpay_order(
                db=db,
                user_id=user_id,
                match_id=match.id,
                registration_id=reg.id,
                amount_minor=match.entry_fee_minor
            )

        # 5. Broadcast real-time slot update (Section 29)
        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_match_event(match.id, "SLOT_RESERVED", {
            "match_id": match.id,
            "slot_number": slot_number,
            "status": "RESERVED",
            "reserved_until": reserved_until.isoformat()
        })

        return reg, razorpay_order

    @staticmethod
    async def confirm_slot_payment(
        db: AsyncSession,
        registration_id: str,
        payment_id: str
    ) -> MatchRegistration:
        reg_stmt = select(MatchRegistration).where(MatchRegistration.id == registration_id).with_for_update()
        reg = (await db.execute(reg_stmt)).scalar_one_or_none()
        if not reg:
            raise EntityNotFoundException("Registration", registration_id)

        now = datetime.now(timezone.utc)
        reg.status = RegistrationStatus.CONFIRMED.value
        reg.confirmed_at = now
        reg.payment_id = payment_id

        # Update slot
        slot_stmt = select(MatchSlot).where(
            and_(
                MatchSlot.match_id == reg.match_id,
                MatchSlot.slot_number == reg.slot_number
            )
        ).with_for_update()
        slot = (await db.execute(slot_stmt)).scalar_one_or_none()
        if slot:
            slot.status = SlotStatus.CONFIRMED.value
            slot.confirmed_at = now
            slot.reserved_until = None

        # Update match count
        match_stmt = select(Match).where(Match.id == reg.match_id).with_for_update()
        match = (await db.execute(match_stmt)).scalar_one_or_none()
        if match:
            match.current_players += 1
            if match.current_players >= match.max_players:
                match.status = MatchStatus.FULL.value

        await db.flush()

        # Broadcast SLOT_CONFIRMED event
        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_match_event(reg.match_id, "SLOT_CONFIRMED", {
            "match_id": reg.match_id,
            "slot_number": reg.slot_number,
            "status": "CONFIRMED",
            "current_players": match.current_players if match else 0,
            "is_full": (match.current_players >= match.max_players) if match else False
        })

        return reg

    @staticmethod
    async def admin_update_match(
        db: AsyncSession,
        match_id: str,
        req: MatchUpdateRequest,
        admin_id: str
    ) -> Match:
        stmt = select(Match).where(Match.id == match_id).with_for_update()
        match = (await db.execute(stmt)).scalar_one_or_none()
        if not match:
            raise EntityNotFoundException("Match", match_id)

        # Update fields safely without recreating match (Section 21, 22, 89)
        if req.map_name is not None:
            match.map_name = req.map_name
        if req.rules_text is not None:
            match.rules_text = req.rules_text
        if req.registration_close_at is not None:
            match.registration_close_at = ensure_utc(req.registration_close_at)
        if req.match_start_at is not None:
            match.match_start_at = ensure_utc(req.match_start_at)
        if req.room_release_at is not None:
            match.room_release_at = ensure_utc(req.room_release_at)
        if req.status is not None:
            match.status = req.status.value if hasattr(req.status, "value") else str(req.status)

        # Secure room credentials update
        credentials_updated = False
        if req.room_id is not None:
            match.room_id_encrypted = encrypt_room_credential(req.room_id)
            credentials_updated = True
        if req.room_password is not None:
            match.room_password_encrypted = encrypt_room_credential(req.room_password)
            credentials_updated = True

        now = datetime.now(timezone.utc)
        release_at = match.room_release_at
        if release_at.tzinfo is None:
            release_at = release_at.replace(tzinfo=timezone.utc)

        # Check if room should be released now
        if credentials_updated and match.room_id_encrypted and now >= release_at:
            match.room_release_status = RoomReleaseStatus.RELEASED.value

        await db.flush()

        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_match_event(match.id, "MATCH_UPDATED", {
            "match_id": match.id,
            "status": match.status,
            "room_credentials_available": bool(match.room_id_encrypted),
            "room_released": match.room_release_status == RoomReleaseStatus.RELEASED.value
        })

        if match.room_release_status == RoomReleaseStatus.RELEASED.value:
            await ws_manager.broadcast_match_event(match.id, "ROOM_RELEASED", {
                "match_id": match.id,
                "message": "Room credentials are now available for confirmed players"
            })

        return match
