"""Persist orchestration run results to disk as timestamped JSON files."""

import json
from datetime import datetime
from pathlib import Path

RUNS_DIR = Path(__file__).resolve().parent.parent / "runs"


def save_run(result) -> Path:
    """Save an OrchestratorResult to runs/<timestamp>.json and return the path."""
    RUNS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = RUNS_DIR / f"{ts}.json"
    data = {
        "timestamp": datetime.now().isoformat(),
        "goal": result.goal,
        "subtasks": result.subtasks,
        "worker_results": [
            {"task": r.task, "result": r.result} for r in result.worker_results
        ],
        "summary": result.summary,
    }
    path.write_text(json.dumps(data, indent=2))
    return path


def load_last_run() -> "dict | None":
    """Return the most recent run as a dict, or None if no runs exist."""
    if not RUNS_DIR.exists():
        return None
    files = sorted(RUNS_DIR.glob("*.json"))
    if not files:
        return None
    return json.loads(files[-1].read_text())
