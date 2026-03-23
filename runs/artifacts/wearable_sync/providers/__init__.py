from .garmin import GarminProvider
from .strava import StravaProvider
from .fitbit import FitbitProvider
from .base import BaseProvider, RawSyncData
from ..models import Provider

PROVIDER_REGISTRY: dict[str, BaseProvider] = {
    Provider.GARMIN: GarminProvider(),
    Provider.STRAVA: StravaProvider(),
    Provider.FITBIT: FitbitProvider(),
}

def get_provider(name: str) -> BaseProvider:
    try:
        key = Provider(name.lower())
    except ValueError:
        raise ValueError(f"Unknown provider '{name}'. Valid: {list(PROVIDER_REGISTRY)}")
    return PROVIDER_REGISTRY[key]
