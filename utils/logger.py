import re
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

_SECRET_RE = re.compile(
    r'(sk-ant-[A-Za-z0-9_\-]{20,}'
    r'|eyJ[A-Za-z0-9_\-]{30,}'   # JWT tokens
    r'|Bearer\s+\S{10,}'
    r'|password["\s:=]+\S{6,})',
    re.IGNORECASE,
)

def _mask(msg: str) -> str:
    return _SECRET_RE.sub("***REDACTED***", str(msg))


def info(message: str) -> None:
    console.print(f"[info]INFO[/info]  {_mask(message)}")


def warning(message: str) -> None:
    console.print(f"[warning]WARN[/warning]  {_mask(message)}")


def error(message: str) -> None:
    console.print(f"[error]ERROR[/error] {_mask(message)}")


def success(message: str) -> None:
    console.print(f"[success]OK[/success]    {_mask(message)}")


def orchestrator(message: str) -> None:
    console.print(f"[orchestrator]ORCH[/orchestrator]  {_mask(message)}")


def worker(message: str) -> None:
    console.print(f"[worker]WORK[/worker]  {_mask(message)}")
