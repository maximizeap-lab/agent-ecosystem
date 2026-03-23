"""
Celery task definitions for scheduled and real-time triggered syncs.

Broker: Redis  (REDIS_URL env var)
Backend: Redis (same URL)

Usage examples:
  # One-time manual trigger
  sync_user_task.delay(user_id="u123", provider_name="strava")

  # Beat schedule (see celery_app.conf.beat_schedule below)
  Automatically fires sync_all_users_task every SYNC_INTERVAL_MINUTES.
"""

import asyncio
import logging
from typing import Optional

from celery import Celery
from celery.schedules import crontab
from celery.utils.log import get_task_logger
from sqlalchemy.orm import Session

from .config import SYNC_CONFIG
from .database import SessionLocal
from .models import OAuthToken, Provider
from .sync_engine import SyncEngine

logger = get_task_logger(__name__)

# ---------------------------------------------------------------------------
# Celery application
# ---------------------------------------------------------------------------

celery_app = Celery(
    "wearable_sync",
    broker=SYNC_CONFIG.redis_url,
    backend=SYNC_CONFIG.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,                 # only ack after task completes (safer)
    worker_prefetch_multiplier=1,        # one task at a time per worker
    task_track_started=True,
    result_expires=86400,                # 1 day
    # Retry configuration
    task_default_retry_delay=30,         # seconds
    task_max_retries=SYNC_CONFIG.max_retries,
    # Beat — periodic tasks
    beat_schedule={
        "sync-all-users-scheduled": {
            "task": "wearable_sync.tasks.sync_all_users_task",
            "schedule": SYNC_CONFIG.scheduled_interval_minutes * 60,  # seconds
            "options": {"expires": SYNC_CONFIG.scheduled_interval_minutes * 55},
        },
    },
)


# ---------------------------------------------------------------------------
# Helper to run async functions inside Celery (sync) tasks
# ---------------------------------------------------------------------------

def _run_async(coro):
    """Run an async coroutine from a synchronous Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="wearable_sync.tasks.sync_user_task",
    max_retries=SYNC_CONFIG.max_retries,
    default_retry_delay=SYNC_CONFIG.retry_backoff_base ** 2,
)
def sync_user_task(
    self,
    user_id: str,
    provider_name: str,
    sync_type: str = "scheduled",
    since_iso: Optional[str] = None,
    until_iso: Optional[str] = None,
):
    """
    Celery task: sync a single user/provider pair.
    Can be triggered manually, by the scheduler, or by a webhook event.
    """
    from datetime import datetime

    since = datetime.fromisoformat(since_iso) if since_iso else None
    until = datetime.fromisoformat(until_iso) if until_iso else None

    db: Session = SessionLocal()
    try:
        engine = SyncEngine(db)
        log = _run_async(
            engine.sync_user(
                user_id=user_id,
                provider_name=provider_name,
                sync_type=sync_type,
                since=since,
                until=until,
            )
        )
        logger.info(
            "sync_user_task done: user=%s provider=%s status=%s records=%d",
            user_id, provider_name, log.status, log.records_synced,
        )
        return {"status": log.status.value, "records_synced": log.records_synced}

    except Exception as exc:
        logger.exception("sync_user_task failed for user=%s provider=%s", user_id, provider_name)
        raise self.retry(exc=exc, countdown=SYNC_CONFIG.retry_backoff_base ** self.request.retries)
    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="wearable_sync.tasks.sync_realtime_activity_task",
    max_retries=SYNC_CONFIG.max_retries,
)
def sync_realtime_activity_task(
    self,
    user_id: str,
    provider_name: str,
    external_activity_id: str,
):
    """
    Real-time task: fetch and upsert a single activity by its provider ID.
    Typically enqueued by a webhook handler.
    """
    db: Session = SessionLocal()
    try:
        engine = SyncEngine(db)
        log = _run_async(
            engine.sync_single_activity(
                user_id=user_id,
                provider_name=provider_name,
                external_activity_id=external_activity_id,
            )
        )
        logger.info(
            "Realtime activity sync done: user=%s provider=%s activity=%s status=%s",
            user_id, provider_name, external_activity_id, log.status,
        )
        return {"status": log.status.value}

    except Exception as exc:
        logger.exception("Realtime sync failed for activity %s", external_activity_id)
        raise self.retry(exc=exc, countdown=SYNC_CONFIG.retry_backoff_base ** self.request.retries)
    finally:
        db.close()


@celery_app.task(name="wearable_sync.tasks.sync_all_users_task")
def sync_all_users_task():
    """
    Beat task: iterate all connected users and enqueue individual sync tasks.
    This keeps the beat task lightweight — it only dispatches; workers do the work.
    """
    db: Session = SessionLocal()
    dispatched = 0
    try:
        tokens = db.query(OAuthToken).all()
        for token in tokens:
            sync_user_task.delay(
                user_id=token.user_id,
                provider_name=token.provider.value,
                sync_type="scheduled",
            )
            dispatched += 1
        logger.info("sync_all_users_task: dispatched %d sync jobs", dispatched)
        return {"dispatched": dispatched}
    finally:
        db.close()
