"""
scripts/batch_run.py — Submit a goal to the Anthropic Batch API.

No rate limits. 50% cheaper than real-time API.
Best for non-urgent runs — results arrive in minutes, not seconds.

Usage:
    python scripts/batch_run.py "your goal here"           # submit
    python scripts/batch_run.py --check <batch_id>         # check status
    python scripts/batch_run.py --results <batch_id>       # fetch + display results
"""

import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import anthropic
from agents.orchestrator import Chloe
from agents.base import WORKER_MAX_TOKENS
from agents.worker import WORKER_SYSTEM_PROMPT
from utils import logger
from utils.storage import save_run

console = Console()
BATCH_DIR = Path(__file__).resolve().parent.parent / "runs" / "batches"


def submit_batch(goal: str) -> str:
    """Plan the goal, then submit all worker tasks as a single Anthropic batch."""
    BATCH_DIR.mkdir(parents=True, exist_ok=True)

    console.print(Rule("[bold cyan]Batch Submit[/bold cyan]"))
    logger.info(f"Planning goal: {goal}")

    orchestrator = Chloe()
    subtasks = orchestrator._plan(goal)
    logger.orchestrator(f"Planned {len(subtasks)} subtasks")

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    requests = [
        {
            "custom_id": f"worker-{i}",
            "params": {
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": WORKER_MAX_TOKENS,
                "system": WORKER_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": task}],
            },
        }
        for i, task in enumerate(subtasks)
    ]

    batch = client.messages.batches.create(requests=requests)
    logger.success(f"Batch submitted: {batch.id}")
    logger.info(f"Status: {batch.processing_status}")

    # Save metadata for later retrieval
    meta = {
        "batch_id": batch.id,
        "goal": goal,
        "subtasks": subtasks,
        "submitted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    meta_path = BATCH_DIR / f"{batch.id}.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    logger.info(f"Metadata saved: {meta_path}")

    console.print()
    console.print(f"[bold green]Batch ID:[/bold green] {batch.id}")
    console.print(f"[dim]Check status:[/dim]  python scripts/batch_run.py --check {batch.id}")
    console.print(f"[dim]Get results:[/dim]   python scripts/batch_run.py --results {batch.id}")
    return batch.id


def check_batch(batch_id: str) -> None:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    batch = client.messages.batches.retrieve(batch_id)
    console.print(f"Status: [bold]{batch.processing_status}[/bold]")
    console.print(f"Request counts: {batch.request_counts}")


def fetch_results(batch_id: str) -> None:
    """Retrieve batch results, synthesise, and save the run."""
    meta_path = BATCH_DIR / f"{batch_id}.json"
    if not meta_path.exists():
        logger.error(f"No metadata found for batch {batch_id}")
        return

    meta = json.loads(meta_path.read_text())
    goal = meta["goal"]
    subtasks = meta["subtasks"]

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    batch = client.messages.batches.retrieve(batch_id)

    if batch.processing_status != "ended":
        logger.warning(f"Batch not finished yet — status: {batch.processing_status}")
        return

    # Collect results in order
    results_map: "dict[str, str]" = {}
    for result in client.messages.batches.results(batch_id):
        if result.result.type == "succeeded":
            text = "".join(
                b.text for b in result.result.message.content if hasattr(b, "text")
            )
            results_map[result.custom_id] = text
        else:
            results_map[result.custom_id] = f"[FAILED: {result.result.type}]"

    from agents.worker import WorkerResult
    worker_results = [
        WorkerResult(task=task, result=results_map.get(f"worker-{i}", "[no result]"))
        for i, task in enumerate(subtasks)
    ]

    console.print(Rule("[bold green]Synthesising Results[/bold green]"))
    orchestrator = Chloe()
    summary = orchestrator._synthesise(goal, worker_results)

    from agents.orchestrator import ChloeResult
    result_obj = ChloeResult(
        goal=goal, subtasks=subtasks, worker_results=worker_results, summary=summary
    )
    run_path = save_run(result_obj)
    logger.success(f"Run saved → {run_path}")


def main() -> None:
    if len(sys.argv) < 2:
        console.print("[red]Usage:[/red]")
        console.print('  python scripts/batch_run.py "your goal here"')
        console.print('  python scripts/batch_run.py --check <batch_id>')
        console.print('  python scripts/batch_run.py --results <batch_id>')
        raise SystemExit(1)

    if sys.argv[1] == "--check" and len(sys.argv) == 3:
        check_batch(sys.argv[2])
    elif sys.argv[1] == "--results" and len(sys.argv) == 3:
        fetch_results(sys.argv[2])
    else:
        submit_batch(sys.argv[1])


if __name__ == "__main__":
    main()
