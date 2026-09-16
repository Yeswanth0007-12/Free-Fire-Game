from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class PlayerProfile(Base):
    __tablename__ = "player_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    free_fire_uid = Column(String(50), nullable=False, index=True)
    free_fire_name = Column(String(100), nullable=False)
    preferred_game = Column(String(50), default="Free Fire", nullable=False)

    # Aggregated Stats
    total_matches = Column(Integer, default=0, nullable=False)
    total_wins = Column(Integer, default=0, nullable=False)
    total_losses = Column(Integer, default=0, nullable=False)
    total_winnings_minor = Column(BigInteger, default=0, nullable=False)
    current_streak = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="profile")

    __table_args__ = (
        UniqueConstraint("free_fire_uid", name="uq_player_profiles_ff_uid"),
    )
