"""
Configuration for wearable/third-party API integrations.
Loads credentials and sync settings from environment variables.
"""

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class GarminConfig:
    client_id: str = field(default_factory=lambda: os.getenv("GARMIN_CLIENT_ID", ""))
    client_secret: str = field(default_factory=lambda: os.getenv("GARMIN_CLIENT_SECRET", ""))
    redirect_uri: str = field(default_factory=lambda: os.getenv("GARMIN_REDIRECT_URI", "http://localhost:8000/auth/garmin/callback"))
    auth_url: str = "https://connect.garmin.com/oauthConfirm"
    token_url: str = "https://connectapi.garmin.com/oauth-service/oauth/token"
    api_base: str = "https://apis.garmin.com/wellness-api/rest"
    scopes: list = field(default_factory=lambda: ["activities", "sleep", "body_composition", "heart_rate"])


@dataclass
class StravaConfig:
    client_id: str = field(default_factory=lambda: os.getenv("STRAVA_CLIENT_ID", ""))
    client_secret: str = field(default_factory=lambda: os.getenv("STRAVA_CLIENT_SECRET", ""))
    redirect_uri: str = field(default_factory=lambda: os.getenv("STRAVA_REDIRECT_URI", "http://localhost:8000/auth/strava/callback"))
    auth_url: str = "https://www.strava.com/oauth/authorize"
    token_url: str = "https://www.strava.com/oauth/token"
    api_base: str = "https://www.strava.com/api/v3"
    scopes: list = field(default_factory=lambda: ["read", "activity:read_all", "profile:read_all"])


@dataclass
class FitbitConfig:
    client_id: str = field(default_factory=lambda: os.getenv("FITBIT_CLIENT_ID", ""))
    client_secret: str = field(default_factory=lambda: os.getenv("FITBIT_CLIENT_SECRET", ""))
    redirect_uri: str = field(default_factory=lambda: os.getenv("FITBIT_REDIRECT_URI", "http://localhost:8000/auth/fitbit/callback"))
    auth_url: str = "https://www.fitbit.com/oauth2/authorize"
    token_url: str = "https://api.fitbit.com/oauth2/token"
    api_base: str = "https://api.fitbit.com/1"
    scopes: list = field(default_factory=lambda: ["activity", "heartrate", "sleep", "weight", "profile"])


@dataclass
class SyncConfig:
    # Scheduled sync interval in minutes
    scheduled_interval_minutes: int = int(os.getenv("SYNC_INTERVAL_MINUTES", "30"))
    # Max retries on transient API failures
    max_retries: int = int(os.getenv("SYNC_MAX_RETRIES", "3"))
    # Retry backoff base (seconds)
    retry_backoff_base: int = int(os.getenv("SYNC_RETRY_BACKOFF_BASE", "2"))
    # Database URL for persisting tokens and sync state
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./wearable_sync.db")
    # Redis URL for real-time task queue (Celery broker)
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    # Enable webhook-based real-time sync (if provider supports it)
    enable_webhooks: bool = os.getenv("ENABLE_WEBHOOKS", "true").lower() == "true"
    # Secret for validating incoming webhook payloads
    webhook_secret: str = os.getenv("WEBHOOK_SECRET", "change-me-in-production")


GARMIN_CONFIG = GarminConfig()
STRAVA_CONFIG = StravaConfig()
FITBIT_CONFIG = FitbitConfig()
SYNC_CONFIG = SyncConfig()
