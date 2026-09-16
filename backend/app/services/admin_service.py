from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.user import User, UserRole, UserStatus
from app.models.match import Match, MatchStatus, SettlementStatus
from app.models.wallet import WalletTransaction, TransactionType, TransactionStatus
from app.models.payment import Payment, PaymentStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.audit_log import AuditLog
from app.models.risk_flag import RiskFlag, RiskSeverity
from app.schemas.admin import AdminDashboardStats


class AdminService:
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> AdminDashboardStats:
        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        # Users count
        total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
        active_players = (await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.PLAYER, User.status == UserStatus.ACTIVE)
        )).scalar() or 0

        # Matches
        matches_today = (await db.execute(
            select(func.count(Match.id)).where(Match.created_at >= today_start)
        )).scalar() or 0

        live_matches = (await db.execute(
            select(func.count(Match.id)).where(Match.status.in_([MatchStatus.IN_PROGRESS, MatchStatus.ROOM_READY]))
        )).scalar() or 0

        completed_matches = (await db.execute(
            select(func.count(Match.id)).where(Match.status == MatchStatus.COMPLETED)
        )).scalar() or 0

        # Financials from transactions
        entry_revenue = (await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount_minor), 0)).where(
                WalletTransaction.type == TransactionType.ENTRY_FEE,
                WalletTransaction.status == TransactionStatus.SUCCESS
            )
        )).scalar() or 0

        prize_distributed = (await db.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount_minor), 0)).where(
                WalletTransaction.type == TransactionType.PRIZE,
                WalletTransaction.status == TransactionStatus.SUCCESS
            )
        )).scalar() or 0

        # Pending queues
        pending_settlements = (await db.execute(
            select(func.count(Match.id)).where(
                Match.status.in_([MatchStatus.RESULT_SUBMITTED, MatchStatus.AWAITING_RESULT]),
                Match.settlement_status == SettlementStatus.UNSETTLED
            )
        )).scalar() or 0

        pending_disputes = (await db.execute(
            select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.OPEN)
        )).scalar() or 0

        pending_withdrawals = (await db.execute(
            select(func.count(WalletTransaction.id)).where(
                WalletTransaction.type == TransactionType.WITHDRAWAL,
                WalletTransaction.status == TransactionStatus.PENDING
            )
        )).scalar() or 0

        failed_payments = (await db.execute(
            select(func.count(Payment.id)).where(Payment.status == PaymentStatus.FAILED)
        )).scalar() or 0

        return AdminDashboardStats(
            total_users=total_users,
            active_players=active_players,
            matches_today=matches_today,
            live_matches=live_matches,
            completed_matches=completed_matches,
            entry_revenue_minor=entry_revenue,
            prize_distributed_minor=prize_distributed,
            pending_settlements=pending_settlements,
            pending_disputes=pending_disputes,
            pending_withdrawals=pending_withdrawals,
            failed_payments=failed_payments
        )

    @staticmethod
    async def log_action(
        db: AsyncSession,
        actor_user_id: str,
        action: str,
        target_entity_type: str,
        target_entity_id: str,
        before_state: Optional[Dict[str, Any]] = None,
        after_state: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        log = AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_entity_type=target_entity_type,
            target_entity_id=target_entity_id,
            before_state=before_state,
            after_state=after_state,
            ip_address=ip_address
        )
        db.add(log)
        await db.flush()
        return log

    @staticmethod
    async def get_audit_logs(
        db: AsyncSession,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        return list((await db.execute(stmt)).scalars().all())

    @staticmethod
    async def get_risk_flags(
        db: AsyncSession,
        resolved: Optional[bool] = None,
        limit: int = 50
    ) -> List[RiskFlag]:
        stmt = select(RiskFlag)
        if resolved is not None:
            stmt = stmt.where(RiskFlag.resolved == resolved)
        stmt = stmt.order_by(RiskFlag.created_at.desc()).limit(limit)
        return list((await db.execute(stmt)).scalars().all())
