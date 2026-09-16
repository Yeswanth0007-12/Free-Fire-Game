from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

# Configure engine options based on dialect
connect_args = {}
engine_kwargs = {"echo": settings.DEBUG}

if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
else:
    # Supabase PostgreSQL / asyncpg configuration
    # For serverless / pooled Supabase environments, pool size can be tuned
    engine_kwargs["pool_pre_ping"] = True
    if "supabase.co" in settings.DATABASE_URL:
        # Supabase uses pgbouncer which doesn't support prepared statements
        connect_args["ssl"] = "require"
        connect_args["statement_cache_size"] = 0
        engine_kwargs["connect_args"] = connect_args

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
