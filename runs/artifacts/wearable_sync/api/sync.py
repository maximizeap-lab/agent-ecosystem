"""
Manual sync trigger & sync status API.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Provider, SyncLog, SyncStatus
from ..tasks import sync_user_task

router = APIRouter(prefix="/sync", tags=["Sync"])


def _current_user_id(request: Request) -> str:
    user_id = request.headers.get("X-User-Id") or request.cookies.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


class SyncTriggerRequest(BaseModel):
    provider: str
    since: Optional[datetime] = None
    until: Optional[datetime] = None


class SyncTriggerResponse(BaseModel):
    task_id: str
    message: str


class SyncLogResponse(BaseModel):
    id: int
    provider: str
    sync_type: str
    status: str
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    records_synced: int
    error_message: Optional[str]

    class Config:
        from_attributes = True


@router.post("/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(
    body: SyncTriggerRequest,
    user_id: str = Depends(_current_user_id),
):
    """
    Manually trigger a sync for the authenticated user.
    The task runs asynchronously in a Celery worker.
    """
    try:
        Provider(body.provider.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider}")

    task = sync_user_task.delay(
        user_id=user_id,
        provider_name=body.provider.lower(),
        sync_type="manual",
        since_iso=body.since.isoformat() if body.since else None,
        until_iso=body.until.isoformat() if body.until else None,
    )

    return SyncTriggerResponse(
        task_id=task.id,
        message=f"Sync task queued for provider '{body.provider}'",
    )


@router.get("/status/{task_id}")
async def task_status(task_id: str):
    """Poll the status of a queued sync task."""
    from ..tasks import celery_app
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "state": result.state,
        "result": result.result if result.ready() else None,
    }


@router.get("/logs", response_model=list[SyncLogResponse])
async def sync_logs(
    user_id: str = Depends(_current_user_id),
    provider: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List recent sync logs for the authenticated user."""
    query = db.query(SyncLog).filter(SyncLog.user_id == user_id)
    if provider:
        try:
            query = query.filter(SyncLog.provider == Provider(provider.lower()))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    logs = query.order_by(SyncLog.started_at.desc()).limit(limit).all()
    return logs


@router.get("/connected-providers")
async def connected_providers(
    user_id: str = Depends(_current_user_id),
    db: Session = Depends(get_db),
):
    """Return which providers the user has connected."""
    from ..models import OAuthToken
    tokens = db.query(OAuthToken).filter_by(user_id=user_id).all()
    return [
        {
            "provider": t.provider.value,
            "connected_at": t.created_at,
            "token_expires_at": t.expires_at,
            "is_expired": t.is_expired(),
        }
        for t in tokens
    ]
