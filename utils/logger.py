from rich.console import Console
from rich.theme import Theme

_theme = Theme(
    {
        "info": "cyan",
        "warning": "yellow",
        "error": "bold red",
        "success": "bold green",
        "orchestrator": "bold magenta",
        "worker": "bold blue",
    }
)

console = Console(theme=_theme)


def info(message: str) -> None:
    console.print(f"[info]INFO[/info]  {message}")


def warning(message: str) -> None:
    console.print(f"[warning]WARN[/warning]  {message}")


def error(message: str) -> None:
    console.print(f"[error]ERROR[/error] {message}")


def success(message: str) -> None:
    console.print(f"[success]OK[/success]    {message}")


def orchestrator(message: str) -> None:
    console.print(f"[orchestrator]ORCH[/orchestrator]  {message}")


def worker(message: str) -> None:
    console.print(f"[worker]WORK[/worker]  {message}")
