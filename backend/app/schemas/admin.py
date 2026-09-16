from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole, UserStatus
from app.models.risk_flag import RiskSeverity


class AdminDashboardStats(BaseModel):
    total_users: int
    active_players: int
    matches_today: int
    live_matches: int
    completed_matches: int
    entry_revenue_minor: int
    prize_distributed_minor: int
    pending_settlements: int
    pending_disputes: int
    pending_withdrawals: int
    failed_payments: int


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actor_user_id: str
    action: str
    target_entity_type: str
    target_entity_id: str
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime


class RiskFlagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    risk_type: str
    severity: RiskSeverity
    details: Dict[str, Any]
    resolved: bool
    created_at: datetime
    user_email: Optional[str] = None
    free_fire_uid: Optional[str] = None


class UpdateUserStatusRequest(BaseModel):
    status: UserStatus
    reason: Optional[str] = None


class UpdateUserRoleRequest(BaseModel):
    role: UserRole
