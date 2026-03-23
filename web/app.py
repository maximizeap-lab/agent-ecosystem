"""
web/app.py — FastAPI web server for MAP HQ.

Endpoints:
  GET  /                    → desktop dashboard
  GET  /m                   → mobile PWA
  GET  /manifest.json       → PWA manifest
  GET  /sw.js               → service worker

  POST /run                 → submit a MAP HQ goal (SSE)
  GET  /stream/{run_id}     → SSE stream of run progress
  POST /approve/{run_id}    → human-in-the-loop plan approval

  POST /chat                → send a message to Claude directly
  GET  /chat/stream/{id}    → SSE stream of Claude's reply
  POST /chat/clear          → clear conversation history

  GET  /runs                → list past runs
  GET  /runs/{id}           → single run detail
  GET  /artifacts           → list artifact files
  GET  /artifacts/{path}    → artifact content
  GET  /analytics           → usage analytics
  GET  /status              → API health check

Auth:
  Desktop /run — HTTP Basic Auth (DASHBOARD_API_KEY in .env, optional)
  Mobile chat/run — Bearer token (MOBILE_ACCESS_TOKEN in .env, optional)
    Pass as: ?token=xxx  (for EventSource) or Authorization: Bearer xxx
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
from typing import AsyncGenerator, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import anthropic
import re
import secrets
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request, Response
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_SECRET_PATTERN = re.compile(r'(sk-ant-[A-Za-z0-9_\-]{20,}|Bearer\s+\S{10,})')

def _mask(text: str) -> str:
    return _SECRET_PATTERN.sub("***REDACTED***", str(text))

from utils.memory import get_all_runs, get_run, init_db, get_analytics

app = FastAPI(title="MAP HQ")

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if not request.url.path.startswith("/stream") and not request.url.path.startswith("/chat/stream"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "connect-src 'self'"
        )
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agent-ecosystem-five.vercel.app",
        "https://agent-ecosystem.vercel.app",
        "http://localhost:8000",
        "http://localhost:3000",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

_RUN_RATE: dict = {}  # ip → [timestamps]
_RUN_RATE_LOCK = threading.Lock()
_RUN_RATE_LIMIT = 10   # max requests
_RUN_RATE_WINDOW = 60  # per 60 seconds

def _check_rate_limit(client_ip: str) -> bool:
    now = time.time()
    with _RUN_RATE_LOCK:
        times = _RUN_RATE.get(client_ip, [])
        times = [t for t in times if now - t < _RUN_RATE_WINDOW]
        if len(times) >= _RUN_RATE_LIMIT:
            return False
        times.append(now)
        _RUN_RATE[client_ip] = times
    return True
STATIC_DIR = Path(__file__).resolve().parent / "static"
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "runs" / "artifacts"

# ── Auth ───────────────────────────────────────────────────────────────────────

_security = HTTPBasic()
_API_KEY = os.environ.get("DASHBOARD_API_KEY", "")
_MOBILE_TOKEN = os.environ.get("MOBILE_ACCESS_TOKEN", "")

_anthropic = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


def _require_auth(credentials: HTTPBasicCredentials = Depends(_security)):
    """Desktop HTTP Basic Auth — disabled when DASHBOARD_API_KEY is not set."""
    if not _API_KEY:
        return
    ok = secrets.compare_digest(credentials.password.encode(), _API_KEY.encode())
    if not ok:
        raise HTTPException(status_code=401, detail="Unauthorized",
                            headers={"WWW-Authenticate": "Basic"})


def _require_token(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """Mobile token auth — disabled when MOBILE_ACCESS_TOKEN is not set.
    Accepts ?token=xxx (EventSource) or Authorization: Bearer xxx (fetch)."""
    if not _MOBILE_TOKEN:
        return
    provided = token
    if not provided and authorization and authorization.startswith("Bearer "):
        provided = authorization[7:]
    if not provided or not secrets.compare_digest(provided, _MOBILE_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Shared SSE infrastructure ──────────────────────────────────────────────────

_run_queues: "dict[str, queue.Queue]" = {}
_run_lock = threading.Lock()
_approval_store: "dict[str, dict]" = {}


def _emit(run_id: str, event: str, data: str) -> None:
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    with _run_lock:
        if run_id in _run_queues:
            _run_queues[run_id].put(msg)


_SSE_MAX_SECONDS = 3600  # 1 hour hard cap per stream

async def _sse_generator(run_id: str) -> AsyncGenerator[str, None]:
    with _run_lock:
        if run_id not in _run_queues:
            _run_queues[run_id] = queue.Queue()
    q = _run_queues[run_id]
    deadline = time.time() + _SSE_MAX_SECONDS
    try:
        while True:
            if time.time() > deadline:
                yield f"event: error\ndata: {json.dumps('stream timeout')}\n\n"
                break
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


# ── Patched logger for SSE ────────────────────────────────────────────────────

def _make_patched_logger(run_id: str):
    import utils.logger as base_logger

    class PatchedLogger:
        def orchestrator(self, msg):
            base_logger.orchestrator(msg); _emit(run_id, "orchestrator", msg)
        def worker(self, msg):
            base_logger.worker(msg); _emit(run_id, "worker", msg)
        def success(self, msg):
            base_logger.success(msg); _emit(run_id, "success", msg)
        def error(self, msg):
            base_logger.error(msg); _emit(run_id, "error", msg)
        def warning(self, msg):
            base_logger.warning(msg); _emit(run_id, "warning", msg)
        def info(self, msg):
            base_logger.info(msg); _emit(run_id, "info", msg)

    return PatchedLogger()


# ── MAP HQ goal runner ─────────────────────────────────────────────────────────

def _make_approval_callback(run_id: str):
    def callback(goal: str, subtasks: list, plan_review: str):
        event = threading.Event()
        _approval_store[run_id] = {"event": event, "approved": None, "subtasks": None}
        _emit(run_id, "plan_approval", json.dumps({
            "goal": goal, "subtasks": subtasks, "plan_review": plan_review,
        }))
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
        _emit(run_id, "error", "Run cancelled by user." if "cancelled" in str(exc).lower() else str(exc))
    except Exception as exc:
        _emit(run_id, "error", str(exc))
    finally:
        import importlib
        importlib.reload(logger_module)


# ── Direct Claude chat ─────────────────────────────────────────────────────────

# In-memory chat history: chat_id → list of {role, content} messages
_chat_sessions: "dict[str, list]" = {}
_chat_queues: "dict[str, queue.Queue]" = {}

_CHAT_SYSTEM = (
    "You are Claude, a world-class AI assistant. You are embedded in MAP HQ — "
    "a multi-agent orchestration system built by Peter. MAP HQ uses you (Claude Sonnet) "
    "as Aria (the synthesiser), Claude Haiku as Chloe (the planner), and local Ollama "
    "models as Nova workers. You have direct access to chat with Peter here. "
    "Be concise, helpful, and direct. Use markdown formatting when it adds clarity."
)


def _stream_chat(chat_id: str, messages: list) -> None:
    q = _chat_queues.get(chat_id)
    if not q:
        return
    try:
        with _anthropic.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=_CHAT_SYSTEM,
            messages=messages,
        ) as stream:
            full_text = ""
            for chunk in stream.text_stream:
                full_text += chunk
                q.put(f"event: chunk\ndata: {json.dumps(chunk)}\n\n")
            # Save assistant reply to history
            _chat_sessions[chat_id].append({"role": "assistant", "content": full_text})
            q.put(f"event: done\ndata: {json.dumps('done')}\n\n")
    except Exception as exc:
        q.put(f"event: error\ndata: {json.dumps(str(exc))}\n\n")


async def _chat_sse_generator(chat_id: str) -> AsyncGenerator[str, None]:
    q = _chat_queues.get(chat_id)
    if not q:
        yield f"event: error\ndata: {json.dumps('No active chat stream')}\n\n"
        return
    try:
        while True:
            try:
                msg = q.get(timeout=0.1)
                yield msg
                if '"done"' in msg or '"error"' in msg:
                    break
            except queue.Empty:
                yield ": heartbeat\n\n"
                await asyncio.sleep(0.3)
    finally:
        _chat_queues.pop(chat_id, None)


# ── Models ─────────────────────────────────────────────────────────────────────

class GoalRequest(BaseModel):
    goal: str

class ApprovalRequest(BaseModel):
    approved: bool
    subtasks: Optional[list] = None

class ChatMessage(BaseModel):
    message: str
    chat_id: Optional[str] = None


# ── Routes — Static / PWA ──────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    return (STATIC_DIR / "index.html").read_text()


@app.get("/m", response_class=HTMLResponse)
async def mobile():
    return (STATIC_DIR / "mobile.html").read_text()


@app.get("/manifest.json")
async def manifest():
    return FileResponse(STATIC_DIR / "manifest.json", media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker():
    return FileResponse(STATIC_DIR / "sw.js", media_type="application/javascript")


# ── Routes — MAP HQ ───────────────────────────────────────────────────────────

@app.post("/run")
async def submit_run(req: GoalRequest, request: Request,
                     _auth=Depends(_require_auth), _tok=Depends(_require_token)):
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded — max 10 runs/minute")
    run_id = str(uuid.uuid4())[:8]
    with _run_lock:
        _run_queues[run_id] = queue.Queue()
    threading.Thread(target=_run_goal, args=(run_id, req.goal), daemon=True).start()
    return {"run_id": run_id}


@app.get("/stream/{run_id}")
async def stream_run(run_id: str):
    with _run_lock:
        if run_id not in _run_queues:
            _run_queues[run_id] = queue.Queue()
    return StreamingResponse(_sse_generator(run_id), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/approve/{run_id}")
async def approve_run(run_id: str, req: ApprovalRequest):
    if run_id not in _approval_store:
        raise HTTPException(status_code=404, detail="No pending approval")
    data = _approval_store[run_id]
    data["approved"] = req.approved
    data["subtasks"] = req.subtasks
    data["event"].set()
    return {"status": "ok"}


# ── Routes — Direct Claude Chat ───────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatMessage, _tok=Depends(_require_token)):
    chat_id = req.chat_id or str(uuid.uuid4())[:8]
    if chat_id not in _chat_sessions:
        _chat_sessions[chat_id] = []
    _chat_sessions[chat_id].append({"role": "user", "content": req.message})
    messages = list(_chat_sessions[chat_id])
    _chat_queues[chat_id] = queue.Queue()
    threading.Thread(target=_stream_chat, args=(chat_id, messages), daemon=True).start()
    return {"chat_id": chat_id}


@app.get("/chat/stream/{chat_id}")
async def chat_stream(chat_id: str, token: Optional[str] = Query(None)):
    # Token checked here via query param (EventSource can't set headers)
    if _MOBILE_TOKEN and (not token or not secrets.compare_digest(token, _MOBILE_TOKEN)):
        raise HTTPException(status_code=401, detail="Invalid token")
    return StreamingResponse(_chat_sse_generator(chat_id), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/chat/clear")
async def chat_clear(req: ChatMessage, _tok=Depends(_require_token)):
    _chat_sessions.pop(req.chat_id, None)
    return {"status": "cleared"}


# ── Routes — Data ─────────────────────────────────────────────────────────────

@app.get("/runs")
async def list_runs(_auth=Depends(_require_auth)):
    init_db(); return get_all_runs(limit=50)


@app.get("/runs/{run_id}")
async def get_run_detail(run_id: int, _auth=Depends(_require_auth)):
    init_db()
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/artifacts")
async def list_artifacts(_auth=Depends(_require_auth)):
    if not ARTIFACTS_DIR.exists():
        return []
    return [{"path": str(f.relative_to(ARTIFACTS_DIR)),
             "size": f.stat().st_size, "modified": f.stat().st_mtime}
            for f in sorted(ARTIFACTS_DIR.rglob("*")) if f.is_file()]


@app.get("/artifacts/{filepath:path}")
async def get_artifact(filepath: str, _auth=Depends(_require_auth)):
    path = ARTIFACTS_DIR / filepath
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")
    return {"path": filepath, "content": path.read_text(errors="replace")}


@app.get("/analytics")
async def analytics(_auth=Depends(_require_auth)):
    init_db(); return get_analytics()


@app.get("/url")
async def tunnel_url():
    """Returns the current Cloudflare tunnel URL (written by start_tunnel.sh)."""
    url_file = Path(__file__).resolve().parent.parent / "logs" / "tunnel_url.txt"
    url = url_file.read_text().strip() if url_file.exists() else ""
    return {"url": url, "mobile": f"{url}/m" if url else ""}


@app.get("/status")
async def status():
    try:
        _anthropic.models.list()
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
    return {"api": "ok" if api_ok else "error",
            "ollama": "ok" if ollama_ok else "offline",
            "ollama_models": ollama_models}


if __name__ == "__main__":
    import uvicorn
    print("Starting MAP HQ at http://localhost:8000")
    print("Mobile dashboard: http://localhost:8000/m")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
