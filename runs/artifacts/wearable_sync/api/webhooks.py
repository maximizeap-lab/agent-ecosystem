"""
Webhook receivers for real-time push notifications.

Strava:  POST /webhooks/strava
         GET  /webhooks/strava  (subscription verification challenge)

Fitbit:  POST /webhooks/fitbit  (subscriber endpoint)

Garmin:  POST /webhooks/garmin  (push data delivery)

Security:
  - Strava: verify hub.challenge on GET; validate X-Hub-Signature on POST.
  - Fitbit:  validate X-Fitbit-Signature header (HMAC-SHA1).
  - Garmin:  validate X-Garmin-Signature (HMAC-SHA256).
"""

import hashlib
import hmac
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query, Request, Response

from ..config import SYNC_CONFIG
from ..tasks import sync_realtime_activity_task, sync_user_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


# ---------------------------------------------------------------------------
# STRAVA
# ---------------------------------------------------------------------------

@router.get("/strava")
async def strava_challenge(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
):
    """
    Strava subscription verification handshake.
    Strava hits this URL when you create a push subscription.
    """
    if hub_verify_token != SYNC_CONFIG.webhook_secret:
        raise HTTPException(status_code=403, detail="Invalid verify token")
    return {"hub.challenge": hub_challenge}


@router.post("/strava")
async def strava_event(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature: str = Header(default=""),
):
    """
    Receive Strava activity/athlete events and dispatch sync tasks.
    Strava sends: object_type, object_id, aspect_type, owner_id, subscription_id
    """
    body = await request.body()
    _verify_strava_signature(body, x_hub_signature)

    event: Dict[str, Any] = json.loads(body)
    logger.info("Strava webhook: %s", event)

    object_type = event.get("object_type")      # "activity" | "athlete"
    aspect_type = event.get("aspect_type")       # "create" | "update" | "delete"
    object_id = str(event.get("object_id", ""))
    owner_id = str(event.get("owner_id", ""))    # Strava athlete ID → map to your user_id

    if object_type == "activity" and aspect_type in ("create", "update"):
        # Resolve owner_id → internal user_id (replace with your lookup)
        user_id = _resolve_strava_owner(owner_id)
        if user_id:
            background_tasks.add_task(
                _dispatch_strava_activity,
                user_id=user_id,
                activity_id=object_id,
            )
        else:
            logger.warning("Strava webhook: unknown owner_id=%s", owner_id)

    return Response(status_code=200)


def _verify_strava_signature(body: bytes, signature_header: str):
    expected = hmac.new(
        SYNC_CONFIG.webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    received = signature_header.replace("sha256=", "")
    if not hmac.compare_digest(expected, received):
        raise HTTPException(status_code=403, detail="Invalid Strava signature")


def _resolve_strava_owner(owner_id: str) -> str | None:
    """
    Map Strava's numeric athlete ID to your internal user ID.
    Replace with a real DB lookup:
      e.g., db.query(OAuthToken).filter_by(provider='strava', external_id=owner_id).first()
    """
    # Placeholder: assumes owner_id IS the user_id in dev
    return owner_id if owner_id else None


def _dispatch_strava_activity(user_id: str, activity_id: str):
    sync_realtime_activity_task.delay(
        user_id=user_id,
        provider_name="strava",
        external_activity_id=activity_id,
    )


# ---------------------------------------------------------------------------
# FITBIT
# ---------------------------------------------------------------------------

@router.post("/fitbit")
async def fitbit_event(
    request: Request,
    background_tasks: BackgroundTasks,
    x_fitbit_signature: str = Header(default=""),
):
    """
    Receive Fitbit subscriber notifications.
    Fitbit sends a JSON array of update objects per subscriber.
    """
    body = await request.body()
    _verify_fitbit_signature(body, x_fitbit_signature)

    updates = json.loads(body)
    logger.info("Fitbit webhook: %d updates", len(updates))

    for update in updates:
        collection = update.get("collectionType")  # "activities" | "sleep" | ...
        owner_id = str(update.get("ownerId", ""))
        # Map to your internal user_id
        user_id = owner_id  # replace with real lookup

        if collection in ("activities", "sleep"):
            background_tasks.add_task(
                lambda uid=user_id: sync_user_task.delay(
                    user_id=uid,
                    provider_name="fitbit",
                    sync_type="realtime",
                )
            )

    # Fitbit expects 204 No Content on success
    return Response(status_code=204)


def _verify_fitbit_signature(body: bytes, signature_header: str):
    """
    Fitbit signs payloads with HMAC-SHA1 using the client_secret + '&' as key.
    See: https://dev.fitbit.com/build/reference/web-api/developer-guide/using-subscriptions/
    """
    from ..config import FITBIT_CONFIG
    import base64

    key = (FITBIT_CONFIG.client_secret + "&").encode()
    expected = base64.b64encode(
        hmac.new(key, body, hashlib.sha1).digest()
    ).decode()

    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=403, detail="Invalid Fitbit signature")


# ---------------------------------------------------------------------------
# GARMIN
# ---------------------------------------------------------------------------

@router.post("/garmin")
async def garmin_event(
    request: Request,
    background_tasks: BackgroundTasks,
    x_garmin_signature: str = Header(default=""),
):
    """
    Receive Garmin Health API push data.
    Garmin pushes full activity/sleep payloads directly (no per-activity fetch needed).
    """
    body = await request.body()
    _verify_garmin_signature(body, x_garmin_signature)

    payload: Dict[str, Any] = json.loads(body)
    logger.info("Garmin webhook received keys: %s", list(payload.keys()))

    # Garmin pushes data keyed by data type
    for data_type, records in payload.items():
        for record in (records if isinstance(records, list) else [records]):
            user_access_token = record.get("userAccessToken", "")
            # Map userAccessToken → internal user_id (replace with real lookup)
            user_id = user_access_token  # placeholder

            background_tasks.add_task(
                lambda uid=user_id: sync_user_task.delay(
                    user_id=uid,
                    provider_name="garmin",
                    sync_type="realtime",
                )
            )

    return Response(status_code=200)


def _verify_garmin_signature(body: bytes, signature_header: str):
    from ..config import GARMIN_CONFIG
    expected = hmac.new(
        GARMIN_CONFIG.client_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature_header):
        raise HTTPException(status_code=403, detail="Invalid Garmin signature")
