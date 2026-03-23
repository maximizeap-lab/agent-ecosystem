"""
web/app.py — FastAPI web server for the MAP HQ.

Endpoints:
  GET  /                   → dashboard UI
  POST /run                → submit a goal (streams progress via SSE)
  GET  /stream/{run_id}    → SSE stream of run progress
  GET  /runs               → list past runs from memory
  GET  /runs/{id}          → single run details
  GET  /artifacts          → list all artifact files
  GET  /status             → API health check

Start:
  python3 web/app.py
  open http://localhost:8000
"""

import asyncio
import json
import os
import queue
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import secrets
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from utils.memory import get_all_runs, get_run, init_db, get_analytics

app = FastAPI(title="MAP HQ")
STATIC_DIR = Path(__file__).resolve().parent / "static"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "runs" / "artifacts"

_security = HTTPBasic()
_API_KEY = os.environ.get("DASHBOARD_API_KEY", "")

def _require_auth(credentials: HTTPBasicCredentials = Depends(_security)):
    """Require HTTP Basic Auth if DASHBOARD_API_KEY is set in .env."""
    if not _API_KEY:
        return  # Auth disabled — local dev mode
    ok = secrets.compare_digest(credentials.password.encode(), _API_KEY.encode())
    if not ok:
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Basic"})

# Active run event queues: run_id → Queue of SSE event strings
_run_queues: "dict[str, queue.Queue]" = {}
_run_lock = threading.Lock()

# Human-in-the-loop approval store: run_id → {event, approved, subtasks}
_approval_store: "dict[str, dict]" = {}


# ── Models ─────────────────────────────────────────────────────────────────────

class GoalRequest(BaseModel):
    goal: str


class ApprovalRequest(BaseModel):
    approved: bool
    subtasks: Optional[list] = None


# ── SSE helpers ────────────────────────────────────────────────────────────────

def _emit(run_id: str, event: str, data: str) -> None:
    """Push an SSE event to the run's queue."""
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _run_lock:
        if run_id in _run_queues:
            _run_queues[run_id].put(msg)


async def _sse_generator(run_id: str) -> AsyncGenerator[str, None]:
    with _run_lock:
        if run_id not in _run_queues:
            _run_queues[run_id] = queue.Queue()
    q = _run_queues[run_id]
    try:
        while True:
            try:
                msg = q.get(timeout=0.1)
                yield msg
                if '"done"' in msg or '"error"' in msg:
                    break
            except queue.Empty:
                yield ": heartbeat\n\n"
                await asyncio.sleep(0.5)
    finally:
        with _run_lock:
            _run_queues.pop(run_id, None)


# ── Patched logger that also emits SSE ────────────────────────────────────────

def _make_patched_logger(run_id: str):
    import utils.logger as base_logger

    class PatchedLogger:
        def orchestrator(self, msg):
            base_logger.orchestrator(msg)
            _emit(run_id, "orchestrator", msg)

        def worker(self, msg):
            base_logger.worker(msg)
            _emit(run_id, "worker", msg)

        def success(self, msg):
            base_logger.success(msg)
            _emit(run_id, "success", msg)

        def error(self, msg):
            base_logger.error(msg)
            _emit(run_id, "error", msg)

        def warning(self, msg):
            base_logger.warning(msg)
            _emit(run_id, "warning", msg)

        def info(self, msg):
            base_logger.info(msg)
            _emit(run_id, "info", msg)

    return PatchedLogger()


# ── Run orchestration in background thread ─────────────────────────────────────

def _make_approval_callback(run_id: str):
    """Returns a callback that pauses execution and waits for human plan approval via the web UI."""
    def callback(goal: str, subtasks: list, plan_review: str) -> "tuple[bool, list | None]":
        event = threading.Event()
        _approval_store[run_id] = {"event": event, "approved": None, "subtasks": None}
        # Emit plan_approval SSE event so the dashboard shows the approval modal
        _emit(run_id, "plan_approval", json.dumps({
            "goal": goal,
            "subtasks": subtasks,
            "plan_review": plan_review,
        }))
        # Block the worker thread for up to 5 minutes waiting for user response
        timed_out = not event.wait(timeout=300)
        if timed_out:
            _approval_store.pop(run_id, None)
            _emit(run_id, "orchestrator", "Plan approval timed out — proceeding automatically")
            return True, None
        data = _approval_store.pop(run_id, {})
        return data.get("approved", True), data.get("subtasks")
    return callback


def _run_goal(run_id: str, goal: str) -> None:
    import utils.logger as logger_module
    patched = _make_patched_logger(run_id)

    # Patch logger methods for duration of this run
    for attr in ("orchestrator", "worker", "success", "error", "warning", "info"):
        setattr(logger_module, attr, getattr(patched, attr))

    try:
        from agents.orchestrator import Chloe
        from utils.storage import save_run

        _emit(run_id, "start", f"Starting: {goal}")
        orchestrator = Chloe()
        orchestrator.stream_callback = lambda chunk: _emit(run_id, "synthesis", chunk)
        orchestrator.approval_callback = _make_approval_callback(run_id)
        result = orchestrator.execute(goal)
        save_run(result)
        _emit(run_id, "summary", result.summary)
        if result.plan_review:
            _emit(run_id, "plan_review", result.plan_review)
        if result.hr_legal_review:
            _emit(run_id, "compliance", result.hr_legal_review)
        _emit(run_id, "done", f"Completed with {len(result.subtasks)} subtasks")
    except RuntimeError as exc:
        if "cancelled" in str(exc).lower():
            _emit(run_id, "error", "Run cancelled by user.")
        else:
            _emit(run_id, "error", str(exc))
    except Exception as exc:
        _emit(run_id, "error", str(exc))
    finally:
        import importlib
        importlib.reload(logger_module)


# ── Routes ──────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = STATIC_DIR / "index.html"
    return html_path.read_text()


@app.post("/run")
async def submit_run(req: GoalRequest, _: None = Depends(_require_auth)):
    run_id = str(uuid.uuid4())[:8]
    with _run_lock:
        _run_queues[run_id] = queue.Queue()
    thread = threading.Thread(target=_run_goal, args=(run_id, req.goal), daemon=True)
    thread.start()
    return {"run_id": run_id}


@app.get("/stream/{run_id}")
async def stream_run(run_id: str):
    with _run_lock:
        if run_id not in _run_queues:
            _run_queues[run_id] = queue.Queue()
    return StreamingResponse(
        _sse_generator(run_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/approve/{run_id}")
async def approve_run(run_id: str, req: ApprovalRequest):
    """Human-in-the-loop: accept or cancel a plan, optionally with revised subtasks."""
    if run_id not in _approval_store:
        raise HTTPException(status_code=404, detail="No pending approval for this run_id")
    data = _approval_store[run_id]
    data["approved"] = req.approved
    data["subtasks"] = req.subtasks
    data["event"].set()
    return {"status": "ok"}


@app.get("/runs")
async def list_runs():
    init_db()
    return get_all_runs(limit=50)


@app.get("/runs/{run_id}")
async def get_run_detail(run_id: int):
    init_db()
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/artifacts")
async def list_artifacts():
    if not ARTIFACTS_DIR.exists():
        return []
    files = []
    for f in sorted(ARTIFACTS_DIR.rglob("*")):
        if f.is_file():
            files.append({
                "path": str(f.relative_to(ARTIFACTS_DIR)),
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime,
            })
    return files


@app.get("/artifacts/{filepath:path}")
async def get_artifact(filepath: str):
    path = ARTIFACTS_DIR / filepath
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"path": filepath, "content": path.read_text(errors="replace")}


@app.get("/analytics")
async def analytics():
    init_db()
    return get_analytics()


@app.get("/status")
async def status():
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    try:
        client = anthropic.Anthropic(api_key=api_key)
        try:
            client.models.list()  # free GET — verifies auth without spending tokens
        except AttributeError:
            client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=1,
                                   messages=[{"role": "user", "content": "ping"}])
        api_ok = True
    except Exception:
        api_ok = False

    try:
        import httpx
        r = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        ollama_ok = r.status_code == 200
        ollama_models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        ollama_ok = False
        ollama_models = []

    return {
        "api": "ok" if api_ok else "error",
        "ollama": "ok" if ollama_ok else "offline",
        "ollama_models": ollama_models,
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting MAP HQ Web UI at http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
