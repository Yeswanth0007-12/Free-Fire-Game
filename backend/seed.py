import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password, encrypt_room_credential
from app.core.logging import logger, setup_logging
from app.models.user import User, UserRole, UserStatus
from app.models.profile import PlayerProfile
from app.models.game import Game, GameMode
from app.models.match import Match, MatchStatus, ResultStatus, SettlementStatus, TeamAssignmentMode
from app.models.team import Team, TeamMember
from app.models.registration import MatchRegistration, RegistrationStatus
from app.models.wallet import Wallet, WalletTransaction, TransactionType, TransactionDirection, TransactionStatus
from app.models.result import MatchResult, PlacementResult, ResultSubmissionStatus
from app.services.wallet_service import WalletService


async def seed():
    setup_logging()
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        logger.info("Seeding Game and Game Modes...")
        stmt = select(Game).where(Game.slug == "free-fire")
        game = (await db.execute(stmt)).scalar_one_or_none()
        if not game:
            game = Game(
                name="Free Fire",
                slug="free-fire",
                active=True
            )
            db.add(game)
            await db.flush()

        modes_config = [
            {"name": "Solo", "slug": "solo", "format": "SOLO", "team_size": 1, "min": 2, "max": 48, "teams": False},
            {"name": "Lone Wolf 1v1", "slug": "lone-wolf-1v1", "format": "LONE_WOLF", "team_size": 1, "min": 2, "max": 2, "teams": True},
            {"name": "Lone Wolf 2v2", "slug": "lone-wolf-2v2", "format": "LONE_WOLF", "team_size": 2, "min": 4, "max": 4, "teams": True},
            {"name": "Clash Squad 1v1", "slug": "clash-squad-1v1", "format": "CLASH_SQUAD", "team_size": 1, "min": 2, "max": 2, "teams": True},
            {"name": "Clash Squad 2v2", "slug": "clash-squad-2v2", "format": "CLASH_SQUAD", "team_size": 2, "min": 4, "max": 4, "teams": True},
            {"name": "Clash Squad 4v4", "slug": "clash-squad-4v4", "format": "CLASH_SQUAD", "team_size": 4, "min": 8, "max": 8, "teams": True},
        ]

        mode_dict = {}
        for mc in modes_config:
            m_stmt = select(GameMode).where(GameMode.slug == mc["slug"])
            gm = (await db.execute(m_stmt)).scalar_one_or_none()
            if not gm:
                gm = GameMode(
                    game_id=game.id,
                    name=mc["name"],
                    slug=mc["slug"],
                    format=mc["format"],
                    team_size=mc["team_size"],
                    min_players=mc["min"],
                    max_players=mc["max"],
                    requires_teams=mc["teams"],
                    active=True
                )
                db.add(gm)
                await db.flush()
            mode_dict[mc["slug"]] = gm

        logger.info("Seeding Admin User...")
        admin_stmt = select(User).where(User.email == "admin@freefire.gg")
        admin = (await db.execute(admin_stmt)).scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@freefire.gg",
                phone="9876543210",
                password_hash=hash_password("Admin@123456"),
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE,
                is_verified=True
            )
            db.add(admin)
            await db.flush()

            admin_profile = PlayerProfile(
                user_id=admin.id,
                display_name="Tournament Director",
                free_fire_uid="FF_ADMIN_000",
                free_fire_name="Director[Admin]",
                preferred_game="Free Fire"
            )
            db.add(admin_profile)

            admin_wallet = Wallet(
                user_id=admin.id,
                currency="INR",
                available_balance_minor=1000000,  # ₹10,000 for testing
                locked_balance_minor=0,
                winning_balance_minor=0
            )
            db.add(admin_wallet)
            await db.flush()

        logger.info("Seeding Test Players...")
        players = []
        for i in range(1, 9):
            email = f"player{i}@freefire.gg"
            p_stmt = select(User).where(User.email == email)
            player = (await db.execute(p_stmt)).scalar_one_or_none()
            if not player:
                player = User(
                    email=email,
                    phone=f"987650000{i}",
                    password_hash=hash_password("Player@123456"),
                    role=UserRole.PLAYER,
                    status=UserStatus.ACTIVE,
                    is_verified=True
                )
                db.add(player)
                await db.flush()

                p_profile = PlayerProfile(
                    user_id=player.id,
                    display_name=f"Viper_{i}",
                    free_fire_uid=f"FF_VIPER_00{i}",
                    free_fire_name=f"ViperX{i}",
                    preferred_game="Free Fire",
                    total_matches=5,
                    total_wins=3 if i <= 4 else 1,
                    total_losses=2 if i <= 4 else 4,
                    total_winnings_minor=15000 if i <= 4 else 2000,
                    current_streak=2 if i <= 4 else 0
                )
                db.add(p_profile)

                # Give players ₹500 starting wallet balance
                p_wallet = Wallet(
                    user_id=player.id,
                    currency="INR",
                    available_balance_minor=50000,  # ₹500.00
                    locked_balance_minor=0,
                    winning_balance_minor=10000   # ₹100.00
                )
                db.add(p_wallet)
                await db.flush()

                # Record seed deposit transaction
                tx = WalletTransaction(
                    wallet_id=p_wallet.id,
                    type=TransactionType.BONUS,
                    amount_minor=50000,
                    direction=TransactionDirection.CREDIT,
                    balance_after_minor=50000,
                    reference_type="DEV_SEED",
                    reference_id=f"SEED_{player.id}",
                    idempotency_key=f"SEED_BONUS_{player.id}",
                    description="Development signup starter balance",
                    status=TransactionStatus.SUCCESS
                )
                db.add(tx)
                await db.flush()

            players.append(player)

        logger.info("Seeding Sample Matches...")
        now = datetime.now(timezone.utc)

        # 1. Upcoming Clash Squad 4v4 (Registration Open)
        cs4v4 = mode_dict["clash-squad-4v4"]
        m1_stmt = select(Match).where(Match.public_match_code == "FF-CS4401")
        m1 = (await db.execute(m1_stmt)).scalar_one_or_none()
        if not m1:
            m1 = Match(
                public_match_code="FF-CS4401",
                game_id=game.id,
                mode_id=cs4v4.id,
                map_name="Bermuda",
                match_format="4v4",
                entry_fee_minor=5000,  # ₹50
                prize_pool_minor=35000,  # ₹350
                currency="INR",
                prize_distribution={"1": 100},
                max_players=8,
                current_players=0,
                max_teams=2,
                registration_start_at=now - timedelta(hours=1),
                registration_close_at=now + timedelta(minutes=25),
                match_start_at=now + timedelta(minutes=40),
                room_release_at=now + timedelta(minutes=30),
                room_id_encrypted=encrypt_room_credential("8492041"),
                room_password_encrypted=encrypt_room_credential("freefire77"),
                host_id=admin.id,
                team_assignment_mode=TeamAssignmentMode.AUTO,
                status=MatchStatus.REGISTRATION_OPEN,
                result_status=ResultStatus.PENDING,
                settlement_status=SettlementStatus.UNSETTLED,
                rules_text="Standard Clash Squad rules. Gun skins allowed. Character skills ON. Roof camping strictly prohibited."
            )
            db.add(m1)
            await db.flush()

            # Create Teams
            t1 = Team(match_id=m1.id, name="Team Alpha", slot_number=1, status="ACTIVE")
            t2 = Team(match_id=m1.id, name="Team Bravo", slot_number=2, status="ACTIVE")
            db.add_all([t1, t2])
            await db.flush()

            # Register 6 players (so 6/8 slots filled)
            for idx in range(6):
                p = players[idx]
                reg = MatchRegistration(
                    match_id=m1.id,
                    user_id=p.id,
                    team_id=t1.id if idx < 3 else t2.id,
                    status=RegistrationStatus.CONFIRMED,
                    slot_number=idx + 1,
                    entry_fee_minor=5000
                )
                db.add(reg)
                await db.flush()

                tm = TeamMember(
                    team_id=t1.id if idx < 3 else t2.id,
                    registration_id=reg.id,
                    user_id=p.id
                )
                db.add(tm)
                m1.current_players += 1

        # 2. Lone Wolf 1v1 (Starts soon)
        lw1v1 = mode_dict["lone-wolf-1v1"]
        m2_stmt = select(Match).where(Match.public_match_code == "FF-LW1102")
        m2 = (await db.execute(m2_stmt)).scalar_one_or_none()
        if not m2:
            m2 = Match(
                public_match_code="FF-LW1102",
                game_id=game.id,
                mode_id=lw1v1.id,
                map_name="Iron Cage",
                match_format="1v1",
                entry_fee_minor=2000,  # ₹20
                prize_pool_minor=3500,  # ₹35
                currency="INR",
                prize_distribution={"1": 100},
                max_players=2,
                current_players=1,
                max_teams=2,
                registration_start_at=now - timedelta(minutes=30),
                registration_close_at=now + timedelta(minutes=10),
                match_start_at=now + timedelta(minutes=20),
                room_release_at=now + timedelta(minutes=15),
                room_id_encrypted=encrypt_room_credential("9910482"),
                room_password_encrypted=encrypt_room_credential("lone99"),
                host_id=admin.id,
                team_assignment_mode=TeamAssignmentMode.AUTO,
                status=MatchStatus.REGISTRATION_OPEN,
                result_status=ResultStatus.PENDING,
                settlement_status=SettlementStatus.UNSETTLED,
                rules_text="1v1 Duel. First to 5 rounds wins. No Grenades."
            )
            db.add(m2)
            await db.flush()

            t1 = Team(match_id=m2.id, name="Gladiator 1", slot_number=1, status="ACTIVE")
            t2 = Team(match_id=m2.id, name="Gladiator 2", slot_number=2, status="ACTIVE")
            db.add_all([t1, t2])
            await db.flush()

            reg = MatchRegistration(
                match_id=m2.id,
                user_id=players[6].id,
                team_id=t1.id,
                status=RegistrationStatus.CONFIRMED,
                slot_number=1,
                entry_fee_minor=2000
            )
            db.add(reg)
            await db.flush()
            db.add(TeamMember(team_id=t1.id, registration_id=reg.id, user_id=players[6].id))

        # 3. Completed Clash Squad 2v2 with Settled Winnings
        cs2v2 = mode_dict["clash-squad-2v2"]
        m3_stmt = select(Match).where(Match.public_match_code == "FF-CS2203")
        m3 = (await db.execute(m3_stmt)).scalar_one_or_none()
        if not m3:
            m3 = Match(
                public_match_code="FF-CS2203",
                game_id=game.id,
                mode_id=cs2v2.id,
                map_name="Kalahari",
                match_format="2v2",
                entry_fee_minor=4000,  # ₹40
                prize_pool_minor=14000,  # ₹140
                currency="INR",
                prize_distribution={"1": 100},
                max_players=4,
                current_players=4,
                max_teams=2,
                registration_start_at=now - timedelta(hours=3),
                registration_close_at=now - timedelta(hours=2),
                match_start_at=now - timedelta(hours=1, minutes=45),
                room_release_at=now - timedelta(hours=1, minutes=55),
                room_id_encrypted=encrypt_room_credential("7740211"),
                room_password_encrypted=encrypt_room_credential("kalahari12"),
                host_id=admin.id,
                team_assignment_mode=TeamAssignmentMode.AUTO,
                status=MatchStatus.COMPLETED,
                result_status=ResultStatus.APPROVED,
                settlement_status=SettlementStatus.SETTLED,
                rules_text="2v2 Duo Clash. Best of 7 rounds."
            )
            db.add(m3)
            await db.flush()

            t1 = Team(match_id=m3.id, name="Team Alpha", slot_number=1, status="ACTIVE")
            t2 = Team(match_id=m3.id, name="Team Bravo", slot_number=2, status="ACTIVE")
            db.add_all([t1, t2])
            await db.flush()

            # Register 4 players (Team 1: player 1 & 2; Team 2: player 3 & 4)
            for idx in range(4):
                p = players[idx]
                target_team = t1 if idx < 2 else t2
                reg = MatchRegistration(
                    match_id=m3.id,
                    user_id=p.id,
                    team_id=target_team.id,
                    status=RegistrationStatus.CONFIRMED,
                    slot_number=idx + 1,
                    entry_fee_minor=4000
                )
                db.add(reg)
                await db.flush()
                db.add(TeamMember(team_id=target_team.id, registration_id=reg.id, user_id=p.id))

            # Add result and settlement records
            m_res = MatchResult(
                match_id=m3.id,
                provider="ADMIN_MANUAL",
                winning_team_id=t1.id,
                winner_user_ids=[players[0].id, players[1].id],
                submitted_by_user_id=admin.id,
                verified_by_user_id=admin.id,
                status=ResultSubmissionStatus.APPROVED,
                scores={"rounds_won": 4, "rounds_lost": 2, "winning_team": "Team Alpha"},
                notes="Clean match verified. Team Alpha won 4-2.",
                submitted_at=now - timedelta(hours=1),
                verified_at=now - timedelta(minutes=50)
            )
            db.add(m_res)
            await db.flush()

            # Credit prize to winners (₹70 each)
            for w_idx in [0, 1]:
                winner = players[w_idx]
                db.add(PlacementResult(
                    match_result_id=m_res.id,
                    user_id=winner.id,
                    team_id=t1.id,
                    placement=1,
                    kills=4,
                    score=1200,
                    payout_minor=7000,  # ₹70
                    is_settled=True
                ))
                # Post transaction
                await WalletService.post_transaction(
                    db=db,
                    user_id=winner.id,
                    type=TransactionType.PRIZE,
                    amount_minor=7000,
                    direction=TransactionDirection.CREDIT,
                    reference_type="MATCH",
                    reference_id=m3.id,
                    idempotency_key=f"MATCH_PRIZE:{m3.id}:{winner.id}",
                    description=f"Prize winnings for match {m3.public_match_code}",
                    is_winning=True
                )

            # Record losing placements
            for l_idx in [2, 3]:
                loser = players[l_idx]
                db.add(PlacementResult(
                    match_result_id=m_res.id,
                    user_id=loser.id,
                    team_id=t2.id,
                    placement=2,
                    kills=1,
                    score=600,
                    payout_minor=0,
                    is_settled=True
                ))

        await db.commit()
        logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    asyncio.run(seed())
