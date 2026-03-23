"""
Fitbit Web API adapter.

Reference: https://dev.fitbit.com/build/reference/web-api/
Fitbit supports subscription-based real-time push notifications.
"""

import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from ..config import FITBIT_CONFIG
from .base import BaseProvider

logger = logging.getLogger(__name__)


class FitbitProvider(BaseProvider):
    provider_name = "fitbit"

    def __init__(self):
        self.cfg = FITBIT_CONFIG

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
            "expires_in": "604800",  # 7 days
        }
        return f"{self.cfg.auth_url}?{urlencode(params)}"

    def _basic_auth_header(self) -> str:
        credentials = f"{self.cfg.client_id}:{self.cfg.client_secret}"
        return "Basic " + base64.b64encode(credentials.encode()).decode()

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.cfg.redirect_uri,
                },
                headers={
                    "Authorization": self._basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=15,
            )
            resp.raise_for_status()
        return self._parse_token_response(resp.json())

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={
                    "Authorization": self._basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout=15,
            )
            resp.raise_for_status()
        return self._parse_token_response(resp.json())

    @staticmethod
    def _parse_token_response(data: Dict[str, Any]) -> Dict[str, Any]:
        expires_in = data.get("expires_in", 28800)
        expires_at = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(seconds=expires_in)
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
        GET /1/user/-/activities/list.json
        Fitbit returns activities in reverse-chronological order.
        """
        after_date = (since or (datetime.utcnow() - timedelta(days=1))).strftime("%Y-%m-%dT%H:%M:%S")
        params: Dict[str, Any] = {
            "afterDate": after_date,
            "sort": "asc",
            "limit": 100,
            "offset": 0,
        }

        activities: List[Dict[str, Any]] = []
        async with httpx.AsyncClient() as client:
            while True:
                resp = await client.get(
                    f"{self.cfg.api_base}/user/-/activities/list.json",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=20,
                )
                resp.raise_for_status()
                payload = resp.json()
                page = payload.get("activities", [])
                activities.extend(page)

                pagination = payload.get("pagination", {})
                if not pagination.get("next"):
                    break
                params["offset"] += len(page)

        if until:
            activities = [
                a for a in activities
                if datetime.fromisoformat(a.get("startTime", "2000-01-01T00:00:00")) <= until
            ]

        logger.debug("Fitbit: fetched %d activities", len(activities))
        return activities

    async def fetch_sleep(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        GET /1.2/user/-/sleep/list.json
        """
        after_date = (since or (datetime.utcnow() - timedelta(days=1))).strftime("%Y-%m-%dT%H:%M:%S")
        params: Dict[str, Any] = {
            "afterDate": after_date,
            "sort": "asc",
            "limit": 100,
            "offset": 0,
        }

        records: List[Dict[str, Any]] = []
        async with httpx.AsyncClient() as client:
            while True:
                resp = await client.get(
                    f"https://api.fitbit.com/1.2/user/-/sleep/list.json",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=20,
                )
                resp.raise_for_status()
                payload = resp.json()
                page = payload.get("sleep", [])
                records.extend(page)

                pagination = payload.get("pagination", {})
                if not pagination.get("next"):
                    break
                params["offset"] += len(page)

        logger.debug("Fitbit: fetched %d sleep records", len(records))
        return records

    # ------------------------------------------------------------------
    # Subscription management (real-time push)
    # ------------------------------------------------------------------

    async def create_subscription(
        self, access_token: str, collection: str = "activities", subscriber_id: str = "1"
    ) -> Dict[str, Any]:
        """
        POST /1/user/-/<collection>/apiSubscriptions/<subscriber_id>.json
        collections: activities | sleep | body | foods | userRevokedAccess
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.cfg.api_base}/user/-/{collection}/apiSubscriptions/{subscriber_id}.json",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
            resp.raise_for_status()
        return resp.json()

    async def delete_subscription(
        self, access_token: str, collection: str = "activities", subscriber_id: str = "1"
    ) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.cfg.api_base}/user/-/{collection}/apiSubscriptions/{subscriber_id}.json",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
            resp.raise_for_status()

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def normalize_activity(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        start_raw = raw.get("startTime", "")
        try:
            start_time = datetime.fromisoformat(start_raw)
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
        except ValueError:
            start_time = datetime.utcnow().replace(tzinfo=timezone.utc)

        return {
            "external_id": str(raw.get("logId", "")),
            "activity_type": raw.get("activityName", "unknown").lower(),
            "name": raw.get("activityName"),
            "start_time": start_time,
            "duration_seconds": raw.get("duration", 0) // 1000,  # Fitbit sends ms
            "distance_meters": raw.get("distance", 0) * 1000,    # km → m
            "calories": raw.get("calories"),
            "avg_heart_rate": raw.get("averageHeartRate"),
            "max_heart_rate": None,
            "elevation_gain_meters": raw.get("elevationGain"),
            "avg_speed_mps": None,
            "max_speed_mps": None,
            "steps": raw.get("steps"),
            "raw_data": raw,
        }

    def normalize_sleep(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        start_raw = raw.get("startTime", "")
        end_raw = raw.get("endTime", "")

        def _parse_dt(s: str) -> Optional[datetime]:
            if not s:
                return None
            dt = datetime.fromisoformat(s)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

        summary = raw.get("levels", {}).get("summary", {})
        return {
            "external_id": str(raw.get("logId", "")),
            "sleep_start": _parse_dt(start_raw),
            "sleep_end": _parse_dt(end_raw),
            "duration_seconds": raw.get("duration", 0) // 1000,
            "sleep_score": raw.get("efficiency"),
            "deep_sleep_seconds": summary.get("deep", {}).get("minutes", 0) * 60,
            "light_sleep_seconds": summary.get("light", {}).get("minutes", 0) * 60,
            "rem_sleep_seconds": summary.get("rem", {}).get("minutes", 0) * 60,
            "awake_seconds": summary.get("wake", {}).get("minutes", 0) * 60,
            "raw_data": raw,
        }
