"""
SQLAlchemy models for storing OAuth tokens, sync state, and normalized activity data.
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, JSON, ForeignKey, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()


class Provider(str, enum.Enum):
    GARMIN = "garmin"
    STRAVA = "strava"
    FITBIT = "fitbit"


class SyncStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class OAuthToken(Base):
    """
    Stores OAuth2 access/refresh tokens per user per provider.
    Tokens are encrypted at rest (see token_store.py).
    """
    __tablename__ = "oauth_tokens"
    __table_args__ = (UniqueConstraint("user_id", "provider", name="uq_user_provider"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    provider = Column(SAEnum(Provider), nullable=False)
    access_token = Column(String(2048), nullable=False)       # stored encrypted
    refresh_token = Column(String(2048), nullable=True)       # stored encrypted
    expires_at = Column(DateTime, nullable=True)
    scope = Column(String(512), nullable=True)
    token_type = Column(String(64), default="Bearer")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sync_logs = relationship("SyncLog", back_populates="token", cascade="all, delete-orphan")

    def is_expired(self) -> bool:
        if self.expires_at is None:
            return False
        return datetime.utcnow() >= self.expires_at

    def __repr__(self):
        return f"<OAuthToken user={self.user_id} provider={self.provider}>"


class SyncLog(Base):
    """
    Tracks every sync attempt — scheduled or real-time — per user per provider.
    """
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(Integer, ForeignKey("oauth_tokens.id"), nullable=False)
    user_id = Column(String(128), nullable=False, index=True)
    provider = Column(SAEnum(Provider), nullable=False)
    sync_type = Column(String(32), default="scheduled")   # "scheduled" | "realtime" | "manual"
    status = Column(SAEnum(SyncStatus), default=SyncStatus.PENDING)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    records_synced = Column(Integer, default=0)
    error_message = Column(String(1024), nullable=True)
    extra = Column(JSON, nullable=True)

    token = relationship("OAuthToken", back_populates="sync_logs")

    def __repr__(self):
        return f"<SyncLog user={self.user_id} provider={self.provider} status={self.status}>"


class Activity(Base):
    """
    Normalized activity record regardless of originating provider.
    """
    __tablename__ = "activities"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "external_id", name="uq_activity_external"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    provider = Column(SAEnum(Provider), nullable=False)
    external_id = Column(String(256), nullable=False)          # provider's own ID
    activity_type = Column(String(64), nullable=True)          # e.g. "running", "cycling"
    name = Column(String(256), nullable=True)
    start_time = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    distance_meters = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    avg_heart_rate = Column(Float, nullable=True)
    max_heart_rate = Column(Float, nullable=True)
    elevation_gain_meters = Column(Float, nullable=True)
    avg_speed_mps = Column(Float, nullable=True)
    max_speed_mps = Column(Float, nullable=True)
    steps = Column(Integer, nullable=True)
    raw_data = Column(JSON, nullable=True)                     # full provider payload
    synced_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Activity user={self.user_id} type={self.activity_type} start={self.start_time}>"


class SleepRecord(Base):
    """Normalized sleep data."""
    __tablename__ = "sleep_records"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "external_id", name="uq_sleep_external"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    provider = Column(SAEnum(Provider), nullable=False)
    external_id = Column(String(256), nullable=False)
    sleep_start = Column(DateTime, nullable=False)
    sleep_end = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    sleep_score = Column(Float, nullable=True)
    deep_sleep_seconds = Column(Integer, nullable=True)
    light_sleep_seconds = Column(Integer, nullable=True)
    rem_sleep_seconds = Column(Integer, nullable=True)
    awake_seconds = Column(Integer, nullable=True)
    raw_data = Column(JSON, nullable=True)
    synced_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SleepRecord user={self.user_id} start={self.sleep_start}>"
