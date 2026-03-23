"""
Strava API v3 adapter.

Reference: https://developers.strava.com/docs/reference/
Strava supports webhooks for real-time activity push notifications.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
import time

import httpx

from ..config import STRAVA_CONFIG
from .base import BaseProvider

logger = logging.getLogger(__name__)

_STRAVA_TYPE_MAP = {
    "Run": "running",
    "Ride": "cycling",
    "Swim": "swimming",
    "Walk": "walking",
    "Hike": "hiking",
    "WeightTraining": "strength",
    "Yoga": "yoga",
    "Workout": "workout",
}


class StravaProvider(BaseProvider):
    provider_name = "strava"

    def __init__(self):
        self.cfg = STRAVA_CONFIG

    # ------------------------------------------------------------------
    # OAuth helpers
    # ------------------------------------------------------------------

    def build_auth_url(self, state: str) -> str:
        params = {
            "client_id": self.cfg.client_id,
            "redirect_uri": self.cfg.redirect_uri,
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": ",".join(self.cfg.scopes),
            "state": state,
        }
        return f"{self.cfg.auth_url}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                json={
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
                timeout=15,
            )
            resp.raise_for_status()
        return self._parse_token_response(resp.json())

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self.cfg.token_url,
                json={
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                timeout=15,
            )
            resp.raise_for_status()
        return self._parse_token_response(resp.json())

    @staticmethod
    def _parse_token_response(data: Dict[str, Any]) -> Dict[str, Any]:
        expires_at = datetime.fromtimestamp(data.get("expires_at", time.time() + 3600), tz=timezone.utc)
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
        per_page: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        GET /athlete/activities  — paginated list of activities.
        """
        params: Dict[str, Any] = {"per_page": per_page, "page": 1}
        if since:
            params["after"] = int(since.timestamp())
        if until:
            params["before"] = int(until.timestamp())

        activities: List[Dict[str, Any]] = []

        async with httpx.AsyncClient() as client:
            while True:
                resp = await client.get(
                    f"{self.cfg.api_base}/athlete/activities",
                    params=params,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=20,
                )
                resp.raise_for_status()
                page_data = resp.json()
                if not page_data:
                    break
                activities.extend(page_data)
                if len(page_data) < per_page:
                    break
                params["page"] += 1

        logger.debug("Strava: fetched %d activities", len(activities))
        return activities

    async def fetch_activity_detail(self, access_token: str, activity_id: int) -> Dict[str, Any]:
        """Fetch a single detailed activity (triggered by webhook event)."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.cfg.api_base}/activities/{activity_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=20,
            )
            resp.raise_for_status()
        return resp.json()

    async def fetch_sleep(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        # Strava does not provide sleep data
        logger.debug("Strava: no sleep endpoint available")
        return []

    # ------------------------------------------------------------------
    # Webhook subscription management
    # ------------------------------------------------------------------

    async def create_webhook_subscription(self, callback_url: str, verify_token: str) -> Dict[str, Any]:
        """
        Register a webhook subscription with Strava.
        POST https://www.strava.com/api/v3/push_subscriptions
        """
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.cfg.api_base}/push_subscriptions",
                data={
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                    "callback_url": callback_url,
                    "verify_token": verify_token,
                },
                timeout=15,
            )
            resp.raise_for_status()
        return resp.json()

    async def delete_webhook_subscription(self, subscription_id: int) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.cfg.api_base}/push_subscriptions/{subscription_id}",
                params={
                    "client_id": self.cfg.client_id,
                    "client_secret": self.cfg.client_secret,
                },
                timeout=15,
            )
            resp.raise_for_status()

    # ------------------------------------------------------------------
    # Normalization
    # ------------------------------------------------------------------

    def normalize_activity(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        start_raw = raw.get("start_date") or raw.get("start_date_local", "")
        start_time = (
            datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
            if start_raw
            else datetime.utcnow().replace(tzinfo=timezone.utc)
        )
        strava_type = raw.get("type", "")
        return {
            "external_id": str(raw.get("id", "")),
            "activity_type": _STRAVA_TYPE_MAP.get(strava_type, strava_type.lower()),
            "name": raw.get("name"),
            "start_time": start_time,
            "duration_seconds": raw.get("elapsed_time") or raw.get("moving_time"),
            "distance_meters": raw.get("distance"),
            "calories": raw.get("calories"),
            "avg_heart_rate": raw.get("average_heartrate"),
            "max_heart_rate": raw.get("max_heartrate"),
            "elevation_gain_meters": raw.get("total_elevation_gain"),
            "avg_speed_mps": raw.get("average_speed"),
            "max_speed_mps": raw.get("max_speed"),
            "steps": None,  # Strava doesn't expose step count in summary
            "raw_data": raw,
        }

    def normalize_sleep(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        # Strava does not provide sleep data
        return {}
