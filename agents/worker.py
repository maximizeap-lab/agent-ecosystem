from pydantic import BaseModel

from agents.base import BaseAgent, WORKER_TOOLS
from agents.local_agent import LocalAgent
from utils import logger
from utils.router import route_task, ollama_available

WORKER_SYSTEM_PROMPT = """\
You are a focused research, writing, and implementation specialist. You receive a \
single, well-defined task and produce a thorough, accurate response.

When a task involves creating something concrete (code, a schema, a config, a document), \
write_file to produce the actual artifact — don't just describe it. \
Keep prose output clear and concise.\
"""


class WorkerResult(BaseModel):
    task: str
    result: str
    model_used: str = "unknown"


class WorkerAgent(BaseAgent):
    """Handles a single focused subtask, routing to the most efficient model."""

    def __init__(self, **kwargs) -> None:
        kwargs.setdefault("system_prompt", WORKER_SYSTEM_PROMPT)
        super().__init__(**kwargs)
        self._ollama_up = ollama_available()

    def execute(self, task: str) -> WorkerResult:
        logger.worker(f"Starting task: {task}")

        messages = [{"role": "user", "content": task}]
        provider, model = route_task(task)

        if provider == "local" and self._ollama_up:
            agent = LocalAgent(model=model, system_prompt=self.system_prompt)
            result_text = agent.run(messages, tools=WORKER_TOOLS)
            model_used = model
        else:
            # Ollama unavailable — use Claude Haiku with prompt caching
            result_text = self.run(messages, tools=WORKER_TOOLS)
            model_used = "claude-haiku-4-5-20251001"

        logger.worker(f"Completed [{model_used}]: {task[:60]}…")
        return WorkerResult(task=task, result=result_text, model_used=model_used)
