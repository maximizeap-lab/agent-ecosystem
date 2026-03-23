import sys
import os
from pathlib import Path

# Allow imports from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from agents.orchestrator import Chloe
from utils import logger
from utils.storage import save_run

console = Console()

LOG_FILE       = Path(__file__).resolve().parent.parent / "logs" / "heal.log"
LAST_FAIL_FILE = Path(__file__).resolve().parent.parent / "logs" / "last_failed_goal.txt"
LOG_TAIL = 10  # number of recent log lines to show in --status


def show_status() -> None:
    console.print(Rule("[bold cyan]Agent Ecosystem Status[/bold cyan]"))
    console.print()

    # API health check
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        console.print("[red]✗ ANTHROPIC_API_KEY is not set[/red]")
    else:
        try:
            client = anthropic.Anthropic(api_key=api_key)
            client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=8,
                messages=[{"role": "user", "content": "ping"}],
            )
            console.print("[green]✓ API reachable — credits available[/green]")
        except anthropic.AuthenticationError:
            console.print("[red]✗ API unreachable — authentication error[/red]")
        except Exception as exc:
            console.print(f"[red]✗ API check failed — {type(exc).__name__}: {exc}[/red]")

    console.print()

    # Recent log entries
    if LOG_FILE.exists():
        lines = LOG_FILE.read_text().splitlines()
        recent = lines[-LOG_TAIL:] if len(lines) >= LOG_TAIL else lines
        log_text = "\n".join(recent) if recent else "(empty)"
        console.print(
            Panel(
                log_text,
                title=f"[bold]Last {LOG_TAIL} log entries[/bold]",
                border_style="cyan",
                padding=(1, 2),
            )
        )
    else:
        console.print("[dim]No heal.log found — run monitor/heal.py to start logging.[/dim]")

    console.print()


def run_heal() -> None:
    """Health check + re-run the last failed goal using heal.py retry logic."""
    import anthropic
    from monitor.heal import check_api_health, run_worker_with_retry

    console.print(Rule("[bold yellow]Heal[/bold yellow]"))
    console.print()

    # Step 1: health check
    healthy = check_api_health()
    console.print()

    if not healthy:
        console.print("[red]API is not healthy — cannot attempt goal re-run.[/red]")
        return

    # Step 2: re-run last failed goal
    if not LAST_FAIL_FILE.exists():
        console.print("[dim]No previous failed goal found — nothing to re-run.[/dim]")
        return

    goal = LAST_FAIL_FILE.read_text().strip()
    if not goal:
        console.print("[dim]Last failed goal file is empty — nothing to re-run.[/dim]")
        return

    console.print(f"[yellow]Re-running last failed goal:[/yellow] {goal}")
    console.print()

    try:
        orchestrator = Chloe()
        subtasks = orchestrator._plan(goal)
        logger.orchestrator(f"Planned {len(subtasks)} subtask(s)")
    except Exception as exc:
        logger.error(f"Planning failed during heal: {exc}")
        return

    from agents.worker import WorkerResult  # WorkerResult kept for type compat
    results = []
    for i, task in enumerate(subtasks, 1):
        logger.orchestrator(f"Healing worker {i}/{len(subtasks)}")
        result_text = run_worker_with_retry(task)
        if result_text is not None:
            results.append(WorkerResult(task=task, result=result_text))

    if not results:
        logger.error("All workers failed during heal.")
        return

    try:
        summary = orchestrator._synthesise(goal, results)
        console.print(Rule("[bold green]Healed Summary[/bold green]"))
        console.print(Panel(summary, border_style="green", padding=(1, 2)))
        LAST_FAIL_FILE.unlink(missing_ok=True)   # clear on success
        logger.success("Heal complete.")
    except Exception as exc:
        logger.error(f"Synthesis failed during heal: {exc}")


def main() -> None:
    if len(sys.argv) < 2:
        console.print("[red]Usage: python scripts/launch.py \"your goal here\"[/red]")
        console.print("[red]       python scripts/launch.py --status[/red]")
        console.print("[red]       python scripts/launch.py --heal[/red]")
        raise SystemExit(1)

    if sys.argv[1] == "--status":
        show_status()
        return

    if sys.argv[1] == "--heal":
        run_heal()
        return

    goal = sys.argv[1]

    console.print(Rule("[bold cyan]Multi-Agent Ecosystem[/bold cyan]"))
    console.print()
    console.print(
        Panel(
            Text(goal, style="italic"),
            title="[bold]Goal[/bold]",
            border_style="cyan",
            padding=(1, 2),
        )
    )
    console.print()

    orchestrator = Chloe()

    try:
        result = orchestrator.execute(goal)
    except Exception as exc:
        logger.error(f"Orchestration failed: {exc}")
        LAST_FAIL_FILE.parent.mkdir(exist_ok=True)
        LAST_FAIL_FILE.write_text(goal)
        logger.warning(f"Goal saved for --heal: {LAST_FAIL_FILE}")
        raise SystemExit(1) from exc

    console.print(Rule("[bold magenta]Subtasks[/bold magenta]"))
    for i, task in enumerate(result.subtasks, start=1):
        console.print(f"  [bold]{i}.[/bold] {task}")
    console.print()

    console.print(Rule("[bold blue]Worker Results[/bold blue]"))
    for worker_result in result.worker_results:
        console.print(
            Panel(
                worker_result.result,
                title=f"[bold blue]{worker_result.task}[/bold blue]",
                border_style="blue",
                padding=(1, 2),
            )
        )
        console.print()

    console.print(Rule("[bold green]Final Summary[/bold green]"))
    console.print(
        Panel(
            result.summary,
            title="[bold green]Orchestrated Summary[/bold green]",
            border_style="green",
            padding=(1, 2),
        )
    )
    console.print()
    run_path = save_run(result)
    logger.success(f"Done. Run saved → {run_path}")


if __name__ == "__main__":
    main()
