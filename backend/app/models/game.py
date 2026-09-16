from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.user import generate_uuid, utc_now


class Game(Base):
    __tablename__ = "games"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    modes = relationship("GameMode", back_populates="game", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="game")


class GameMode(Base):
    __tablename__ = "game_modes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    game_id = Column(String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Clash Squad 4v4", "Lone Wolf 1v1", "Solo"
    slug = Column(String(100), unique=True, index=True, nullable=False)
    format = Column(String(50), nullable=False)  # SOLO, LONE_WOLF, CLASH_SQUAD
    team_size = Column(Integer, default=1, nullable=False)  # 1 for 1v1/solo, 2 for 2v2, 4 for 4v4
    min_players = Column(Integer, default=2, nullable=False)
    max_players = Column(Integer, default=8, nullable=False)
    requires_teams = Column(Boolean, default=True, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    game = relationship("Game", back_populates="modes")
    matches = relationship("Match", back_populates="mode")
