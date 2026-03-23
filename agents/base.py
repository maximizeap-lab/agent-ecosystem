import os
from typing import Any

import anthropic
from dotenv import load_dotenv
from rich.console import Console
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from utils import logger

load_dotenv()

DEFAULT_MODEL  = "claude-sonnet-4-6"
WORKER_MAX_TOKENS = 1500   # workers don't need 4096; keeps token usage lean
_console = Console()


class BaseAgent:
    """Base class for all agents in the ecosystem."""

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        system_prompt: str = "You are a helpful assistant.",
        max_retries: int = 3,
    ) -> None:
        self.model = model
        self.system_prompt = system_prompt
        self.max_retries = max_retries
        self.client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    def run(self, messages: list[dict[str, Any]], tools: "list[dict] | None" = None) -> str:
        """Send messages to the model and return the text response.

        Retries on transient API errors with exponential back-off.
        If tools are provided, handles tool-use loops automatically.
        """

        @retry(
            retry=retry_if_exception_type(
                (
                    anthropic.RateLimitError,
                    anthropic.APIStatusError,
                    anthropic.APIConnectionError,
                )
            ),
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=2, min=5, max=90),
            reraise=True,
        )
        def _call() -> str:
            kwargs: dict[str, Any] = dict(
                model=self.model,
                max_tokens=WORKER_MAX_TOKENS,
                # Prompt caching — system prompt cached for 5 min (saves tokens on repeated calls)
                system=[{
                    "type": "text",
                    "text": self.system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=messages,
            )
            if tools:
                kwargs["tools"] = tools

            response = self.client.messages.create(**kwargs)

            # Agentic tool-use loop
            while response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = _dispatch_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})

                response = self.client.messages.create(**kwargs | {"messages": messages})

            return "".join(
                block.text for block in response.content if hasattr(block, "text")
            )

        return _call()

    def stream(self, messages: list[dict[str, Any]]) -> str:
        """Stream a response to the terminal and return the full text."""
        full_text = ""
        with self.client.messages.stream(
            model=self.model,
            max_tokens=4096,  # synthesis can be longer
            system=[{
                "type": "text",
                "text": self.system_prompt,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                _console.print(text, end="", markup=False)
                full_text += text
        _console.print()
        return full_text


# ── Built-in tools ────────────────────────────────────────────────────────────

WORKER_TOOLS = [
    {
        "name": "write_file",
        "description": (
            "Write content to a file in the workspace runs/artifacts/ directory. "
            "Use this to produce real deliverables: code, configs, docs, etc."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Filename including extension, e.g. api.py"},
                "content":  {"type": "string", "description": "Full file content to write"},
            },
            "required": ["filename", "content"],
        },
    },
    {
        "name": "read_file",
        "description": "Read a file from the workspace runs/artifacts/ directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {"type": "string", "description": "Filename to read"},
            },
            "required": ["filename"],
        },
    },
    {
        "name": "web_search",
        "description": (
            "Search the web for up-to-date information. Use for current best practices, "
            "library versions, API references, or any factual research."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query":       {"type": "string", "description": "Search query"},
                "max_results": {"type": "integer", "description": "Number of results (default 5)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "run_code",
        "description": (
            "Execute Python code and return the output. Use for calculations, data processing, "
            "generating dynamic content, or verifying logic."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python code to execute"},
            },
            "required": ["code"],
        },
    },
    {
        "name": "ask_specialist",
        "description": (
            "Consult a specialist agent for expert advice mid-task. "
            "Specialists: security, architecture, database, devops, frontend, performance."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question":   {"type": "string", "description": "Question for the specialist"},
                "specialist": {"type": "string", "description": "Specialist type: security | architecture | database | devops | frontend | performance"},
            },
            "required": ["question", "specialist"],
        },
    },
]

_ARTIFACTS_DIR = (
    __import__("pathlib").Path(__file__).resolve().parent.parent / "runs" / "artifacts"
)


def _dispatch_tool(name: str, inputs: dict) -> str:
    """Execute a built-in tool and return a string result."""
    _ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    if name == "write_file":
        path = _ARTIFACTS_DIR / inputs["filename"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(inputs["content"])
        logger.success(f"Tool write_file → {path}")
        return f"File written: {path}"

    if name == "read_file":
        path = _ARTIFACTS_DIR / inputs["filename"]
        if not path.exists():
            return f"Error: file not found: {inputs['filename']}"
        return path.read_text()

    if name == "web_search":
        return _tool_web_search(inputs.get("query", ""), inputs.get("max_results", 5))

    if name == "run_code":
        return _tool_run_code(inputs.get("code", ""))

    if name == "ask_specialist":
        return _tool_ask_specialist(inputs.get("question", ""), inputs.get("specialist", "default"))

    return f"Error: unknown tool '{name}'"


def _tool_web_search(query: str, max_results: int = 5) -> str:
    try:
        from duckduckgo_search import DDGS
        results = DDGS().text(query, max_results=max_results)
        if not results:
            return "No results found."
        lines = []
        for r in results:
            lines.append(f"**{r.get('title', '')}**\n{r.get('href', '')}\n{r.get('body', '')}")
        logger.success(f"Tool web_search → {len(results)} results for: {query[:50]}")
        return "\n\n---\n\n".join(lines)
    except Exception as exc:
        return f"Search failed: {exc}"


def _tool_run_code(code: str) -> str:
    import subprocess
    try:
        result = subprocess.run(
            ["python3", "-c", code],
            capture_output=True, text=True, timeout=15,
        )
        output = result.stdout or ""
        errors = result.stderr or ""
        if errors and not output:
            return f"Error:\n{errors}"
        if errors:
            return f"Output:\n{output}\nStderr:\n{errors}"
        logger.success("Tool run_code → executed successfully")
        return output or "(no output)"
    except subprocess.TimeoutExpired:
        return "Error: code execution timed out (15s limit)"
    except Exception as exc:
        return f"Error: {exc}"


def _tool_ask_specialist(question: str, specialist: str) -> str:
    from utils.bus import bus
    logger.success(f"Tool ask_specialist → [{specialist}] {question[:60]}")
    return bus.ask(question, specialist=specialist)
