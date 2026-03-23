"""
Garmin Connect API adapter.

OAuth 1.0a flow (Garmin's wellness API uses OAuth 1.0a for the push model
and OAuth 2.0 for newer endpoints). This implementation targets the
Garmin Health API (OAuth 2.0 / webhook push).

Reference:
  https://developer.garmin.com/gc-developer-program/overview/
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from dateutil import parser as dtparser

from ..config import GARMIN_CONFIG
from .base import BaseProvider

logger = logging.getLogger(__name__)


class GarminProvider(BaseProvider):
    provider_name = "garmin"

    def __init__(self):
        self.cfg = GARMIN_CONFIG

    # ------------------------------------------------------------------
    # OAuth helpers
    # ------------------------------------------------------------------

    def build_auth_url(self, state: str) -> str:
        params = {
            "response_type": "code",
            "client_id": self.cfg.client_id,
            "redirect_uri": self.cfg.redirect_uri,
            "scope": " ".join(self.cfg.scopes),
            "state": state,
        }
        return f"{self.cfg.auth_url}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.cfg.redirect_uri,
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                },
                headers={"Accept": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

        return self._parse_token_response(data)

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                },
                headers={"Accept": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

        return self._parse_token_response(data)

    @staticmethod
    def _parse_token_response(data: Dict[str, Any]) -> Dict[str, Any]:
        import time
        expires_in = data.get("expires_in", 3600)
        expires_at = datetime.fromtimestamp(time.time() + expires_in, tz=timezone.utc)
        return {
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token"),
            "expires_at": expires_at,
            "scope": data.get("scope", ""),
            "token_type": data.get("token_type", "Bearer"),
        }

    # ------------------------------------------------------------------
    # Data fetch
    # ------------------------------------------------------------------

    async def fetch_activities(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Pull activity summaries from Garmin Wellness API.
        Garmin uses uploadStartTimeInSeconds / uploadEndTimeInSeconds params.
        """
        now = int(datetime.utcnow().timestamp())
        params: Dict[str, Any] = {
            "uploadStartTimeInSeconds": int(since.timestamp()) if since else now - 86400,
            "uploadEndTimeInSeconds": int(until.timestamp()) if until else now,
        }
        url = f"{self.cfg.api_base}/activities"
        activities: List[Dict[str, Any]] = []

        async with httpx.AsyncClient() as client:
            while url:
                resp = await client.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=20,
                )
                resp.raise_for_status()
                payload = resp.json()
                activities.extend(payload.get("activityDetails", []))
                # Garmin paginates via next link header
                url = resp.links.get("next", {}).get("url")
                params = {}  # pagination token is embedded in next URL

        logger.debug("Garmin: fetched %d activities", len(activities))
        return activities

    async def fetch_sleep(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        now = int(datetime.utcnow().timestamp())
        params: Dict[str, Any] = {
            "uploadStartTimeInSeconds": int(since.timestamp()) if since else now - 86400,
            "uploadEndTimeInSeconds": int(until.timestamp()) if until else now,
        }
        url = f"{self.cfg.api_base}/sleeps"
        records: List[Dict[str, Any]] = []

        async with httpx.AsyncClient() as client:
            while url:
                resp = await client.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=20,
                )
                resp.raise_for_status()
                payload = resp.json()
                records.extend(payload.get("sleeps", []))
                url = resp.links.get("next", {}).get("url")
                params = {}

        logger.debug("Garmin: fetched %d sleep records", len(records))
        return records

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def normalize_activity(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        summary = raw.get("summary", raw)
        return {
            "external_id": str(raw.get("summaryId", raw.get("activityId", ""))),
            "activity_type": summary.get("activityType", "unknown").lower(),
            "name": summary.get("activityName"),
            "start_time": datetime.fromtimestamp(
                summary.get("startTimeInSeconds", 0), tz=timezone.utc
            ),
            "duration_seconds": summary.get("durationInSeconds"),
            "distance_meters": summary.get("distanceInMeters"),
            "calories": summary.get("activeKilocalories"),
            "avg_heart_rate": summary.get("averageHeartRateInBeatsPerMinute"),
            "max_heart_rate": summary.get("maxHeartRateInBeatsPerMinute"),
            "elevation_gain_meters": summary.get("totalElevationGainInMeters"),
            "avg_speed_mps": summary.get("averageSpeedInMetersPerSecond"),
            "max_speed_mps": summary.get("maxSpeedInMetersPerSecond"),
            "steps": summary.get("steps"),
            "raw_data": raw,
        }

    def normalize_sleep(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        summary = raw.get("summary", raw)
        start_ts = summary.get("startTimeInSeconds", 0)
        duration = summary.get("durationInSeconds", 0)
        return {
            "external_id": str(raw.get("summaryId", "")),
            "sleep_start": datetime.fromtimestamp(start_ts, tz=timezone.utc),
            "sleep_end": datetime.fromtimestamp(start_ts + duration, tz=timezone.utc),
            "duration_seconds": duration,
            "sleep_score": summary.get("sleepScores", {}).get("overall"),
            "deep_sleep_seconds": summary.get("deepSleepDurationInSeconds"),
            "light_sleep_seconds": summary.get("lightSleepDurationInSeconds"),
            "rem_sleep_seconds": summary.get("remSleepInSeconds"),
            "awake_seconds": summary.get("awakeDurationInSeconds"),
            "raw_data": raw,
        }
