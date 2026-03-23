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
            {
                "task": r.task,
                "result": r.result,
                "model_used": r.model_used,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "cost_usd": r.cost_usd,
            }
            for r in result.worker_results
        ],
        "summary": result.summary,
        "total_input_tokens": getattr(result, "total_input_tokens", 0),
        "total_output_tokens": getattr(result, "total_output_tokens", 0),
        "total_cost_usd": getattr(result, "total_cost_usd", 0.0),
        "duration_seconds": getattr(result, "duration_seconds", 0.0),
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
