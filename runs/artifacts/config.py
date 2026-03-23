"""
Central configuration management using Pydantic Settings.
Supports environment variables, .env files, and runtime overrides.
"""

from __future__ import annotations

import os
from enum import Enum
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


# ---------------------------------------------------------------------------
# Sub-settings
# ---------------------------------------------------------------------------

class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_")

    url: str = Field(
        default="sqlite+aiosqlite:///./performance_data.db",
        description="SQLAlchemy async database URL",
    )
    pool_size: int = Field(default=10, ge=1, le=100)
    max_overflow: int = Field(default=20, ge=0, le=100)
    pool_timeout: int = Field(default=30, ge=1)
    echo: bool = Field(default=False)
    migration_dir: str = Field(default="alembic")


class RedisSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="REDIS_")

    host: str = Field(default="localhost")
    port: int = Field(default=6379, ge=1, le=65535)
    password: Optional[str] = Field(default=None)
    db: int = Field(default=0, ge=0)
    ssl: bool = Field(default=False)

    @property
    def url(self) -> str:
        scheme = "rediss" if self.ssl else "redis"
        auth = f":{self.password}@" if self.password else ""
        return f"{scheme}://{auth}{self.host}:{self.port}/{self.db}"


class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="STORAGE_")

    upload_dir: Path = Field(default=Path("./uploads"))
    max_upload_size_mb: int = Field(default=100, ge=1, le=5000)
    allowed_extensions: List[str] = Field(
        default=[".csv", ".xlsx", ".xls", ".json", ".parquet"]
    )
    archive_dir: Path = Field(default=Path("./archive"))

    @field_validator("upload_dir", "archive_dir", mode="before")
    @classmethod
    def make_dirs(cls, v: Any) -> Path:
        p = Path(v)
        p.mkdir(parents=True, exist_ok=True)
        return p


class WearableSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WEARABLE_")

    # Garmin
    garmin_client_id: Optional[str] = Field(default=None)
    garmin_client_secret: Optional[str] = Field(default=None)
    garmin_base_url: str = Field(default="https://healthapi.garmin.com/wellness-api/rest")

    # Fitbit
    fitbit_client_id: Optional[str] = Field(default=None)
    fitbit_client_secret: Optional[str] = Field(default=None)
    fitbit_base_url: str = Field(default="https://api.fitbit.com/1")

    # Apple Health (local export)
    apple_health_export_dir: Path = Field(default=Path("./apple_health_exports"))

    # Polar
    polar_client_id: Optional[str] = Field(default=None)
    polar_client_secret: Optional[str] = Field(default=None)
    polar_base_url: str = Field(default="https://www.polaraccesslink.com/v3")

    # Whoop
    whoop_client_id: Optional[str] = Field(default=None)
    whoop_client_secret: Optional[str] = Field(default=None)
    whoop_base_url: str = Field(default="https://api.prod.whoop.com/developer/v1")


class ThirdPartyAPISettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="API_")

    default_timeout_seconds: int = Field(default=30, ge=1, le=300)
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_backoff_factor: float = Field(default=0.5, ge=0.0, le=10.0)
    rate_limit_requests_per_minute: int = Field(default=60, ge=1)
    batch_size: int = Field(default=500, ge=1, le=10_000)


class PipelineSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="PIPELINE_")

    max_concurrent_pipelines: int = Field(default=5, ge=1, le=50)
    default_chunk_size: int = Field(default=1000, ge=100, le=100_000)
    enable_validation: bool = Field(default=True)
    enable_deduplication: bool = Field(default=True)
    dead_letter_queue: bool = Field(default=True)
    dlq_dir: Path = Field(default=Path("./dlq"))
    checkpoint_dir: Path = Field(default=Path("./checkpoints"))
    heartbeat_interval_seconds: int = Field(default=15, ge=5)

    @field_validator("dlq_dir", "checkpoint_dir", mode="before")
    @classmethod
    def make_dirs(cls, v: Any) -> Path:
        p = Path(v)
        p.mkdir(parents=True, exist_ok=True)
        return p


class SecuritySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SECURITY_")

    secret_key: str = Field(
        default="CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_STRING_32CHARS_MIN"
    )
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    api_key_header: str = Field(default="X-API-Key")
    encrypt_pii: bool = Field(default=True)


# ---------------------------------------------------------------------------
# Root settings
# ---------------------------------------------------------------------------

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Meta
    app_name: str = Field(default="Performance Data Ingestion Pipeline")
    version: str = Field(default="1.0.0")
    environment: Environment = Field(default=Environment.DEVELOPMENT)
    log_level: LogLevel = Field(default=LogLevel.INFO)
    debug: bool = Field(default=False)

    # Sub-settings (composed)
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    wearable: WearableSettings = Field(default_factory=WearableSettings)
    api: ThirdPartyAPISettings = Field(default_factory=ThirdPartyAPISettings)
    pipeline: PipelineSettings = Field(default_factory=PipelineSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)

    # CORS
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"]
    )

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment == Environment.PRODUCTION:
            if "CHANGE_ME" in self.security.secret_key:
                raise ValueError("Must set a real SECRET_KEY in production!")
        return self

    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION

    def as_dict(self) -> Dict[str, Any]:
        """Return safe (redacted) config for logging."""
        d = self.model_dump()
        # Redact sensitive fields
        for sensitive in ("secret_key", "password", "client_secret"):
            _redact_nested(d, sensitive)
        return d


def _redact_nested(d: Dict, key: str) -> None:
    for k, v in d.items():
        if k == key and v is not None:
            d[k] = "***REDACTED***"
        elif isinstance(v, dict):
            _redact_nested(v, key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton settings accessor — cached after first call."""
    return Settings()
