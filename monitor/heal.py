"""
monitor/heal.py  —  Self-healing daemon for the agent ecosystem.

Features
--------
1. API health check   — periodically pings Anthropic to confirm reachability / credits
2. Retry failed runs  — if a worker raises, the daemon retries it up to MAX_WORKER_RETRIES
3. Persistent log     — all events written to logs/heal.log
4. Repeated-failure alert — warns when the same task fails more than ALERT_THRESHOLD times

Usage
-----
    python monitor/heal.py --daemon          # run forever (Ctrl-C to stop)
    python monitor/heal.py --once            # one health-check cycle then exit
    python monitor/heal.py --goal "…" --daemon  # also watch a specific goal run
"""

import argparse
import json
import os
import signal
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Allow imports from project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import anthropic
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from utils import logger


def _notify(title: str, message: str) -> None:
    """Send a macOS desktop notification."""
    try:
        import subprocess
        script = f'display notification "{message}" with title "{title}" sound name "Basso"'
        subprocess.run(["osascript", "-e", script], timeout=5, capture_output=True)
    except Exception:
        pass  # Notifications are best-effort — never crash the daemon

# ── Configuration ─────────────────────────────────────────────────────────────
HEALTH_CHECK_INTERVAL = 86400   # seconds between API health checks (once a day)
MAX_WORKER_RETRIES    = 3       # retries before a task is marked permanently failed
ALERT_THRESHOLD       = 3       # failures before a loud alert is raised
LOG_DIR               = Path(__file__).resolve().parent.parent / "logs"
LOG_FILE              = LOG_DIR / "heal.log"
# ──────────────────────────────────────────────────────────────────────────────

console = Console()
_failure_counts: dict[str, int] = defaultdict(int)
_running = True


# ── Logging ───────────────────────────────────────────────────────────────────

def _ensure_log_dir() -> None:
    LOG_DIR.mkdir(exist_ok=True)


def _log(level: str, message: str) -> None:
    """Append a timestamped entry to the persistent log file."""
    _ensure_log_dir()
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with LOG_FILE.open("a") as fh:
        fh.write(f"[{ts}] [{level.upper():7s}] {message}\n")


# ── API Health Check ──────────────────────────────────────────────────────────

def check_api_health() -> bool:
    """
    Send a minimal message to the Anthropic API.
    Returns True if the API is reachable and credits are available.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        msg = "ANTHROPIC_API_KEY is not set."
        logger.error(msg)
        _log("error", msg)
        return False

    try:
        client = anthropic.Anthropic(api_key=api_key)
        # Fix 8: models.list() is a free GET — verifies auth without spending tokens
        try:
            client.models.list()
        except AttributeError:
            # Older SDK fallback — use minimal generation call
            client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=1,
                                   messages=[{"role": "user", "content": "ping"}])
        msg = "API health check PASSED — reachable and credentials valid."
        logger.success(msg)
        _log("info", msg)
        return True

    except anthropic.AuthenticationError as exc:
        msg = f"API health check FAILED — authentication error: {exc}"
        logger.error(msg)
        _log("error", msg)
        _notify("⚠️ Agent Ecosystem", "API authentication failed — check your API key")
        return False

    except Exception as exc:
        msg = f"API health check FAILED — {type(exc).__name__}: {exc}"
        logger.error(msg)
        _log("error", msg)
        _notify("⚠️ Agent Ecosystem", f"API unreachable: {type(exc).__name__}")
        return False


# ── Worker Retry Logic ────────────────────────────────────────────────────────

def run_worker_with_retry(task: str) -> "str | None":
    """
    Execute a single worker task with up to MAX_WORKER_RETRIES attempts.
    Logs every failure.  Returns the result string or None on total failure.
    """
    from agents.worker import Nova

    for attempt in range(1, MAX_WORKER_RETRIES + 1):
        try:
            worker = Nova()
            result = worker.execute(task)
            msg = f"Worker succeeded on attempt {attempt}/{MAX_WORKER_RETRIES}: {task!r}"
            logger.success(msg)
            _log("info", msg)
            _failure_counts[task] = 0          # reset on success
            return result.result

        except Exception as exc:
            _failure_counts[task] += 1
            msg = (
                f"Worker FAILED (attempt {attempt}/{MAX_WORKER_RETRIES}) "
                f"for task {task!r}: {type(exc).__name__}: {exc}"
            )
            logger.error(msg)
            _log("error", msg)

            _check_alert_threshold(task)

            if attempt < MAX_WORKER_RETRIES:
                wait = 2 ** attempt          # 2s, 4s, …
                logger.warning(f"Retrying in {wait}s…")
                time.sleep(wait)

    msg = f"Task permanently failed after {MAX_WORKER_RETRIES} attempts: {task!r}"
    logger.error(msg)
    _log("critical", msg)
    return None


# ── Repeated-failure Alert ────────────────────────────────────────────────────

def _check_alert_threshold(task: str) -> None:
    count = _failure_counts[task]
    if count >= ALERT_THRESHOLD:
        alert = (
            f"ALERT: task has now failed {count} time(s) — "
            f"investigate immediately: {task!r}"
        )
        console.print(
            Panel(alert, title="[bold red]REPEATED FAILURE ALERT[/bold red]",
                  border_style="red")
        )
        _log("critical", alert)
        _notify("🔴 Agent Ecosystem — Critical", f"Task failed {count}x: {task[:60]}")


# ── Goal Run (optional) ───────────────────────────────────────────────────────

def run_goal(goal: str) -> None:
    """Run a full orchestration goal through the ecosystem with healing applied."""
    from agents.orchestrator import Chloe

    logger.orchestrator(f"Daemon running goal: {goal}")
    _log("info", f"Starting goal run: {goal!r}")

    try:
        orchestrator = Chloe()
        subtasks = orchestrator._plan(goal)
        logger.orchestrator(f"Planned {len(subtasks)} subtask(s)")
        _log("info", f"Planned subtasks: {json.dumps(subtasks)}")
    except Exception as exc:
        msg = f"Orchestrator planning failed: {exc}"
        logger.error(msg)
        _log("error", msg)
        return

    results = []
    for i, task in enumerate(subtasks, 1):
        logger.orchestrator(f"Dispatching worker {i}/{len(subtasks)}")
        result_text = run_worker_with_retry(task)
        if result_text is not None:
            results.append({"task": task, "result": result_text})

    if not results:
        msg = "All workers failed — no results to synthesise."
        logger.error(msg)
        _log("error", msg)
        return

    try:
        from agents.worker import WorkerResult
        worker_results = [WorkerResult(**r) for r in results]
        summary = orchestrator._synthesise(goal, worker_results)
        console.print(Rule("[bold green]Final Summary[/bold green]"))
        console.print(Panel(summary, border_style="green", padding=(1, 2)))
        _log("info", "Goal run completed successfully.")
    except Exception as exc:
        msg = f"Synthesis failed: {exc}"
        logger.error(msg)
        _log("error", msg)


# ── Daemon Loop ───────────────────────────────────────────────────────────────

def daemon_loop(goal: "str | None") -> None:
    global _running

    def _handle_signal(sig, frame):
        global _running
        logger.warning("Shutdown signal received — stopping daemon.")
        _log("info", "Daemon stopped by signal.")
        _running = False

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    logger.success("Daemon started. Press Ctrl-C to stop.")
    _log("info", "Daemon started.")

    if goal:
        run_goal(goal)

    while _running:
        console.print(Rule("[bold cyan]Health Check[/bold cyan]"))
        check_api_health()
        for _ in range(HEALTH_CHECK_INTERVAL):
            if not _running:
                break
            time.sleep(1)

    logger.warning("Daemon stopped.")


# ── Entry Point ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Self-healing monitor daemon for the agent ecosystem."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--daemon", action="store_true",
                      help="Run continuously, health-checking every 30 s.")
    mode.add_argument("--once",   action="store_true",
                      help="Run a single health check then exit.")
    parser.add_argument("--goal", type=str, default=None,
                        help="Optional goal to run through the ecosystem on startup.")
    args = parser.parse_args()

    console.print(Rule("[bold cyan]Agent Ecosystem Monitor[/bold cyan]"))

    if args.once:
        check_api_health()
        return

    daemon_loop(goal=args.goal)


if __name__ == "__main__":
    main()
