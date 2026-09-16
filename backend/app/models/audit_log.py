from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, JSON, Text
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_user_id = Column(String(36), index=True, nullable=False)
    action = Column(String(100), index=True, nullable=False)  # e.g. ADMIN_CREATED_MATCH, ADMIN_APPROVED_RESULT
    target_entity_type = Column(String(50), index=True, nullable=False)  # MATCH, USER, WALLET, RESULT
    target_entity_id = Column(String(100), index=True, nullable=False)

    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
