"""
Core sync engine.

Responsibilities:
  1. Token lifecycle — detect expiry, auto-refresh before each sync.
  2. Incremental sync  — track last-synced timestamp to avoid re-fetching.
  3. Upsert activity & sleep records (deduplication via external_id).
  4. Emit SyncLog entries for every attempt (success or failure).
  5. Retry with exponential back-off on transient HTTP errors.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from .config import SYNC_CONFIG
from .models import Activity, SleepRecord, SyncLog, SyncStatus, Provider
from .providers import get_provider
from .token_store import get_token, upsert_token

logger = logging.getLogger(__name__)


class SyncEngine:
    def __init__(self, db: Session):
        self.db = db
        self.cfg = SYNC_CONFIG

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    async def sync_user(
        self,
        user_id: str,
        provider_name: str,
        sync_type: str = "scheduled",
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> SyncLog:
        """
        Full sync for one user/provider pair.
        Returns the SyncLog record for the caller to inspect.
        """
        provider = get_provider(provider_name)
        log = SyncLog(
            user_id=user_id,
            provider=Provider(provider_name.lower()),
            sync_type=sync_type,
            status=SyncStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)

        # Attach log to the token record
        token_record = self.db.query(
            __import__("wearable_sync.models", fromlist=["OAuthToken"]).OAuthToken
        ).filter_by(user_id=user_id, provider=provider.provider_name).first()
        if token_record:
            log.token_id = token_record.id

        try:
            access_token = await self._get_valid_access_token(user_id, provider_name)
        except Exception as exc:
            return self._fail_log(log, f"Token retrieval failed: {exc}")

        # Determine the sync window
        if since is None:
            since = self._last_synced_at(user_id, provider_name) or (
                datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(days=7)
            )
        if until is None:
            until = datetime.utcnow().replace(tzinfo=timezone.utc)

        try:
            raw_data = await self._fetch_with_retry(provider, access_token, since, until)
        except Exception as exc:
            return self._fail_log(log, f"API fetch failed after retries: {exc}")

        # Persist
        activity_count = 0
        sleep_count = 0

        for raw_act in raw_data.activities:
            try:
                normalized = provider.normalize_activity(raw_act)
                if normalized.get("external_id"):
                    self._upsert_activity(user_id, provider_name, normalized)
                    activity_count += 1
            except Exception as exc:
                logger.warning("Failed to normalize activity: %s — %s", raw_act, exc)

        for raw_sleep in raw_data.sleep_records:
            try:
                normalized = provider.normalize_sleep(raw_sleep)
                if normalized.get("external_id"):
                    self._upsert_sleep(user_id, provider_name, normalized)
                    sleep_count += 1
            except Exception as exc:
                logger.warning("Failed to normalize sleep record: %s — %s", raw_sleep, exc)

        self.db.commit()

        log.status = SyncStatus.SUCCESS
        log.finished_at = datetime.utcnow()
        log.records_synced = activity_count + sleep_count
        log.extra = {"activities": activity_count, "sleep_records": sleep_count}
        self.db.commit()

        logger.info(
            "Sync complete: user=%s provider=%s activities=%d sleep=%d",
            user_id, provider_name, activity_count, sleep_count,
        )
        return log

    async def sync_single_activity(
        self,
        user_id: str,
        provider_name: str,
        external_activity_id: str,
    ) -> SyncLog:
        """
        Real-time sync triggered by a webhook event for a single activity.
        Currently supported for Strava.
        """
        provider = get_provider(provider_name)
        log = SyncLog(
            user_id=user_id,
            provider=Provider(provider_name.lower()),
            sync_type="realtime",
            status=SyncStatus.IN_PROGRESS,
            started_at=datetime.utcnow(),
        )
        self.db.add(log)
        self.db.commit()

        try:
            access_token = await self._get_valid_access_token(user_id, provider_name)
        except Exception as exc:
            return self._fail_log(log, str(exc))

        try:
            if provider_name == "strava":
                raw = await provider.fetch_activity_detail(access_token, int(external_activity_id))
                normalized = provider.normalize_activity(raw)
                self._upsert_activity(user_id, provider_name, normalized)
                self.db.commit()
                log.records_synced = 1
            else:
                raise NotImplementedError(f"Single activity sync not implemented for {provider_name}")

        except Exception as exc:
            return self._fail_log(log, str(exc))

        log.status = SyncStatus.SUCCESS
        log.finished_at = datetime.utcnow()
        self.db.commit()
        return log

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _get_valid_access_token(self, user_id: str, provider_name: str) -> str:
        """Return a valid (non-expired) access token, refreshing if needed."""
        token = get_token(self.db, user_id, Provider(provider_name))
        if token is None:
            raise ValueError(f"No token found for user={user_id} provider={provider_name}")

        if token.is_expired():
            if not token.refresh_token:
                raise ValueError(f"Token expired and no refresh token for user={user_id} provider={provider_name}")

            logger.info("Refreshing token: user=%s provider=%s", user_id, provider_name)
            provider = get_provider(provider_name)
            new_token_data = await provider.refresh_access_token(token.refresh_token)
            upsert_token(
                self.db,
                user_id=user_id,
                provider=Provider(provider_name),
                **new_token_data,
            )
            return new_token_data["access_token"]

        return token.access_token

    async def _fetch_with_retry(self, provider, access_token: str, since: datetime, until: datetime):
        """Fetch with exponential back-off retries."""
        import httpx

        last_exc = None
        for attempt in range(1, self.cfg.max_retries + 1):
            try:
                return await provider.fetch_all(access_token, since, until)
            except (httpx.HTTPStatusError, httpx.ConnectError, httpx.TimeoutException) as exc:
                last_exc = exc
                if hasattr(exc, "response") and exc.response is not None:
                    status = exc.response.status_code
                    # Don't retry on auth errors
                    if status in (401, 403):
                        raise
                wait = self.cfg.retry_backoff_base ** attempt
                logger.warning(
                    "Fetch attempt %d/%d failed (%s). Retrying in %ds…",
                    attempt, self.cfg.max_retries, exc, wait,
                )
                await asyncio.sleep(wait)

        raise last_exc

    def _upsert_activity(self, user_id: str, provider_name: str, normalized: dict):
        record = (
            self.db.query(Activity)
            .filter_by(
                user_id=user_id,
                provider=Provider(provider_name),
                external_id=normalized["external_id"],
            )
            .first()
        )
        if record:
            for k, v in normalized.items():
                if v is not None:
                    setattr(record, k, v)
            record.synced_at = datetime.utcnow()
        else:
            record = Activity(
                user_id=user_id,
                provider=Provider(provider_name),
                **normalized,
            )
            self.db.add(record)

    def _upsert_sleep(self, user_id: str, provider_name: str, normalized: dict):
        record = (
            self.db.query(SleepRecord)
            .filter_by(
                user_id=user_id,
                provider=Provider(provider_name),
                external_id=normalized["external_id"],
            )
            .first()
        )
        if record:
            for k, v in normalized.items():
                if v is not None:
                    setattr(record, k, v)
            record.synced_at = datetime.utcnow()
        else:
            record = SleepRecord(
                user_id=user_id,
                provider=Provider(provider_name),
                **normalized,
            )
            self.db.add(record)

    def _last_synced_at(self, user_id: str, provider_name: str) -> Optional[datetime]:
        """Find the most recent successful sync timestamp."""
        last = (
            self.db.query(SyncLog)
            .filter_by(user_id=user_id, provider=Provider(provider_name), status=SyncStatus.SUCCESS)
            .order_by(SyncLog.finished_at.desc())
            .first()
        )
        return last.finished_at.replace(tzinfo=timezone.utc) if last and last.finished_at else None

    def _fail_log(self, log: SyncLog, message: str) -> SyncLog:
        log.status = SyncStatus.FAILED
        log.finished_at = datetime.utcnow()
        log.error_message = message[:1024]
        self.db.commit()
        logger.error("Sync failed: %s", message)
        return log
