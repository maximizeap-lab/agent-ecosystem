"""
SQLAlchemy engine and session factory.
Supports SQLite (dev) and PostgreSQL (production) via DATABASE_URL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .config import SYNC_CONFIG
from .models import Base

engine = create_engine(
    SYNC_CONFIG.database_url,
    # SQLite-specific: enable WAL for concurrent reads
    connect_args={"check_same_thread": False} if "sqlite" in SYNC_CONFIG.database_url else {},
    pool_pre_ping=True,   # reconnect on stale connections
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables. Call once on application startup."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency: yields a DB session and closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
