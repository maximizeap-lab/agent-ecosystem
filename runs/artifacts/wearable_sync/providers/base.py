"""
Abstract base class that every provider adapter must implement.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class RawSyncData:
    """Container returned by each provider's fetch methods."""
    activities: List[Dict[str, Any]] = field(default_factory=list)
    sleep_records: List[Dict[str, Any]] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)


class BaseProvider(ABC):
    """
    All provider adapters share this interface so the sync engine
    can call them polymorphically.
    """

    provider_name: str = ""

    @abstractmethod
    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """
        Exchange an authorization code for tokens.
        Must return a dict with keys:
          access_token, refresh_token, expires_at (datetime), scope, token_type
        """

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Use the refresh token to obtain a new access token.
        Must return the same shape as exchange_code.
        """

    @abstractmethod
    async def fetch_activities(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch raw activity records from the provider API."""

    @abstractmethod
    async def fetch_sleep(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch raw sleep records from the provider API."""

    @abstractmethod
    def normalize_activity(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map a provider-specific activity payload to the normalized Activity schema.
        """

    @abstractmethod
    def normalize_sleep(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map a provider-specific sleep payload to the normalized SleepRecord schema.
        """

    async def fetch_all(
        self,
        access_token: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
    ) -> RawSyncData:
        """Convenience wrapper — fetches both activities and sleep."""
        activities = await self.fetch_activities(access_token, since, until)
        sleep = await self.fetch_sleep(access_token, since, until)
        return RawSyncData(activities=activities, sleep_records=sleep)
