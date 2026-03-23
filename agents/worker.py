from pydantic import BaseModel

from agents.base import Maya, WORKER_TOOLS, estimate_cost
from agents.local_agent import Luna
from utils import logger
from utils.router import route_task, ollama_available
from utils.memory import record_model_success, record_model_failure

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
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0


class Nova(Maya):
    """Handles a single focused subtask, routing to the most efficient model."""

    def __init__(self, **kwargs) -> None:
        kwargs.setdefault("system_prompt", WORKER_SYSTEM_PROMPT)
        super().__init__(**kwargs)

    def execute(self, task: str) -> WorkerResult:
        logger.worker(f"Starting task: {task}")

        messages = [{"role": "user", "content": task}]
        provider, model = route_task(task)
        self._ollama_up = ollama_available()

        input_tokens = output_tokens = 0

        if provider == "local" and self._ollama_up:
            agent = Luna(model=model, system_prompt=self.system_prompt)
            result_text = agent.run(messages, tools=WORKER_TOOLS)
            model_used = model
        elif provider == "haiku" or not self._ollama_up:
            # Unmatched task or Ollama unavailable — use Claude Haiku
            result_text, input_tokens, output_tokens = self.run_with_usage(messages, tools=WORKER_TOOLS)
            model_used = "claude-haiku-4-5-20251001"
        else:
            result_text, input_tokens, output_tokens = self.run_with_usage(messages, tools=WORKER_TOOLS)
            model_used = model

        cost = estimate_cost(model_used, input_tokens, output_tokens)
        record_model_success(task[:80], model_used)
        logger.worker(f"Completed [{model_used}] {input_tokens}in/{output_tokens}out ${cost:.5f}: {task[:50]}…")
        return WorkerResult(
            task=task, result=result_text, model_used=model_used,
            input_tokens=input_tokens, output_tokens=output_tokens, cost_usd=cost,
        )
