"""Async SQLAlchemy database engine and session management."""

import ssl as _ssl
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


def _clean_async_url(url: str) -> str:
    """Convert a standard PostgreSQL URL to one compatible with asyncpg.

    - Replaces postgresql:// with postgresql+asyncpg://
    - Strips query params that asyncpg doesn't recognize (sslmode, channel_binding)
    """
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    params = parse_qs(parsed.query)

    # Remove params asyncpg doesn't support as URL query args
    for key in ("sslmode", "channel_binding"):
        params.pop(key, None)

    # Rebuild query string
    clean_query = urlencode(params, doseq=True)
    cleaned = parsed._replace(query=clean_query)
    return urlunparse(cleaned)


database_url = _clean_async_url(settings.DATABASE_URL)

# Create SSL context for Neon Postgres (asyncpg needs explicit SSL context)
_ssl_ctx = _ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = _ssl.CERT_NONE

engine = create_async_engine(
    database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    connect_args={"ssl": _ssl_ctx},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
