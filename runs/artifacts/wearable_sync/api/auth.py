"""
OAuth 2.0 authorization flow endpoints.
  GET  /auth/{provider}/connect      → redirect to provider's consent screen
  GET  /auth/{provider}/callback     → handle code exchange & store tokens
  DELETE /auth/{provider}/disconnect → revoke stored tokens
"""

import secrets
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Provider
from ..providers import get_provider
from ..token_store import delete_token, upsert_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["OAuth"])

# In production replace with a distributed session store (Redis).
_STATE_STORE: dict[str, str] = {}  # state → user_id


def _current_user_id(request: Request) -> str:
    """
    Stub: replace with your actual auth middleware
    (e.g., JWT decode, session lookup).
    """
    user_id = request.headers.get("X-User-Id") or request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


@router.get("/{provider_name}/connect")
async def connect(
    provider_name: str,
    request: Request,
    user_id: str = Depends(_current_user_id),
):
    """Redirect the user to the provider's OAuth consent screen."""
    try:
        provider = get_provider(provider_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    state = secrets.token_urlsafe(24)
    _STATE_STORE[state] = user_id

    auth_url = provider.build_auth_url(state)
    logger.info("OAuth connect: user=%s provider=%s", user_id, provider_name)
    return RedirectResponse(url=auth_url)


@router.get("/{provider_name}/callback")
async def callback(
    provider_name: str,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """Exchange the authorization code for tokens and persist them."""
    user_id = _STATE_STORE.pop(state, None)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter")

    try:
        provider = get_provider(provider_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        token_data = await provider.exchange_code(code)
    except Exception as exc:
        logger.error("Token exchange failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Provider token exchange failed: {exc}")

    upsert_token(
        db,
        user_id=user_id,
        provider=Provider(provider_name.lower()),
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        expires_at=token_data.get("expires_at"),
        scope=token_data.get("scope"),
        token_type=token_data.get("token_type", "Bearer"),
    )

    # Optionally set up real-time webhooks/subscriptions
    from ..config import SYNC_CONFIG
    if SYNC_CONFIG.enable_webhooks:
        await _setup_realtime_subscription(provider_name, token_data["access_token"], user_id)

    logger.info("OAuth callback success: user=%s provider=%s", user_id, provider_name)
    # Redirect to app dashboard (adjust URL as needed)
    return RedirectResponse(url="/dashboard?connected=" + provider_name)


@router.delete("/{provider_name}/disconnect")
async def disconnect(
    provider_name: str,
    user_id: str = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """Revoke and delete stored tokens for a provider."""
    try:
        Provider(provider_name.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider_name}")

    deleted = delete_token(db, user_id, Provider(provider_name.lower()))
    if not deleted:
        raise HTTPException(status_code=404, detail="No connection found for this provider")

    logger.info("Disconnected: user=%s provider=%s", user_id, provider_name)
    return {"message": f"Disconnected from {provider_name}"}


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

async def _setup_realtime_subscription(provider_name: str, access_token: str, user_id: str):
    """Best-effort — failures are logged but don't break the auth flow."""
    from ..config import SYNC_CONFIG
    try:
        if provider_name == "fitbit":
            from ..providers.fitbit import FitbitProvider
            fb = FitbitProvider()
            await fb.create_subscription(access_token, "activities", subscriber_id=user_id[:20])
            await fb.create_subscription(access_token, "sleep", subscriber_id=user_id[:20])
            logger.info("Fitbit subscriptions created for user=%s", user_id)

        elif provider_name == "strava":
            from ..providers.strava import StravaProvider
            strava = StravaProvider()
            callback_url = f"https://yourapp.example.com/webhooks/strava"  # replace with real URL
            await strava.create_webhook_subscription(callback_url, SYNC_CONFIG.webhook_secret)
            logger.info("Strava webhook subscription created for user=%s", user_id)

    except Exception as exc:
        logger.warning("Real-time subscription setup failed for %s: %s", provider_name, exc)
