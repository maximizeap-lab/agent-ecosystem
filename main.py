from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text

load_dotenv()

from agents.orchestrator import OrchestratorAgent  # noqa: E402 — must follow load_dotenv
from utils import logger  # noqa: E402

console = Console()

GOAL = (
    "Research the pros and cons of microservices vs monoliths and write a summary"
)


def main() -> None:
    console.print(Rule("[bold cyan]Multi-Agent Ecosystem[/bold cyan]"))
    console.print()

    console.print(
        Panel(
            Text(GOAL, style="italic"),
            title="[bold]Goal[/bold]",
            border_style="cyan",
            padding=(1, 2),
        )
    )
    console.print()

    orchestrator = OrchestratorAgent()

    try:
        result = orchestrator.execute(GOAL)
    except Exception as exc:
        logger.error(f"Orchestration failed: {exc}")
        raise SystemExit(1) from exc

    # ------------------------------------------------------------------ #
    # Display subtasks                                                     #
    # ------------------------------------------------------------------ #
    console.print(Rule("[bold magenta]Subtasks[/bold magenta]"))
    for i, task in enumerate(result.subtasks, start=1):
        console.print(f"  [bold]{i}.[/bold] {task}")
    console.print()

    # ------------------------------------------------------------------ #
    # Display individual worker outputs                                   #
    # ------------------------------------------------------------------ #
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

    # ------------------------------------------------------------------ #
    # Display final synthesis                                             #
    # ------------------------------------------------------------------ #
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
    logger.success("Done.")


if __name__ == "__main__":
    main()
