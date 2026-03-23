import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from pydantic import BaseModel

from agents.base import BaseAgent
from agents.worker import WorkerAgent, WorkerResult
from utils import logger

ORCHESTRATOR_SYSTEM_PROMPT = """\
You are a planning and coordination agent. Given a high-level goal, you break it down \
into a list of focused, independent subtasks that can each be handled by a specialist \
worker agent.

Respond ONLY with a valid JSON array of strings — no prose, no markdown fences, no \
extra keys. Each string is a self-contained task description.

Example output:
["Summarise the history of X", "List the main advantages of Y", "Compare X and Y"]\
"""

SYNTHESISER_SYSTEM_PROMPT = """\
You are a senior editor. You receive a goal and a set of research findings produced by \
specialist workers. Synthesise them into a single, well-structured, coherent response \
that directly addresses the original goal. Write in clear, professional prose.\
"""


class OrchestratorResult(BaseModel):
    goal: str
    subtasks: list[str]
    worker_results: list[WorkerResult]
    summary: str


class OrchestratorAgent(BaseAgent):
    """Decomposes a goal into subtasks, delegates to workers, and synthesises results."""

    def __init__(self, **kwargs) -> None:
        kwargs.setdefault("system_prompt", ORCHESTRATOR_SYSTEM_PROMPT)
        # Use Haiku for planning — only needs to output JSON, not quality prose
        kwargs.setdefault("model", "claude-haiku-4-5-20251001")
        super().__init__(**kwargs)
        # Synthesis uses Sonnet — highest quality final output
        self._synthesiser = BaseAgent(
            model="claude-sonnet-4-6",
            system_prompt=SYNTHESISER_SYSTEM_PROMPT,
            max_retries=self.max_retries,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute(self, goal: str) -> OrchestratorResult:
        """Orchestrate workers to accomplish *goal* and return a full result."""
        logger.orchestrator(f"Goal received: {goal}")

        subtasks = self._plan(goal)
        logger.orchestrator(f"Planned {len(subtasks)} subtask(s): {subtasks}")

        worker_results = self._dispatch(subtasks)

        summary = self._synthesise(goal, worker_results)
        logger.orchestrator("Synthesis complete.")

        from utils.memory import save_run as mem_save
        mem_save(goal, subtasks, summary)

        return OrchestratorResult(
            goal=goal,
            subtasks=subtasks,
            worker_results=worker_results,
            summary=summary,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _plan(self, goal: str) -> list[str]:
        """Ask the orchestrator LLM to decompose *goal* into subtasks.
        Checks memory for similar past goals to guide planning."""
        from utils.memory import recall_similar_goals
        similar = recall_similar_goals(goal, limit=2)
        context = ""
        if similar:
            examples = "\n".join(
                f"- Past goal: '{s['goal']}' → subtasks: {s['subtasks'][:3]}…"
                for s in similar
            )
            context = f"\n\nFor reference, here are similar past goals:\n{examples}\n"

        messages = [{"role": "user", "content": f"Goal: {goal}{context}\n\nIMPORTANT: Return at most 8 subtasks."}]
        raw = self.run(messages)

        try:
            # Strip markdown fences if present (some models wrap JSON in ```json ... ```)
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
                cleaned = cleaned.strip()
            subtasks: list[str] = json.loads(cleaned)
            if not isinstance(subtasks, list) or not all(
                isinstance(t, str) for t in subtasks
            ):
                raise ValueError("Expected a JSON array of strings.")
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error(f"Failed to parse subtasks from orchestrator response: {exc}")
            logger.error(f"Raw response was: {raw!r}")
            raise

        return subtasks

    def _dispatch(self, subtasks: list[str]) -> list[WorkerResult]:
        """Spawn workers in parallel and collect results in original order."""
        total = len(subtasks)
        logger.orchestrator(f"Dispatching {total} workers in parallel…")
        results: list[WorkerResult | None] = [None] * total

        def _run(index: int, task: str) -> tuple[int, WorkerResult]:
            worker = WorkerAgent(model=self.model, max_retries=self.max_retries)
            return index, worker.execute(task)

        with ThreadPoolExecutor(max_workers=min(total, 2)) as pool:
            futures = {pool.submit(_run, i, task): i for i, task in enumerate(subtasks)}
            completed = 0
            for future in as_completed(futures):
                index, result = future.result()
                results[index] = result
                completed += 1
                logger.orchestrator(f"Worker {completed}/{total} done: {result.task[:60]}…")

        return [r for r in results if r is not None]

    def _synthesise(self, goal: str, worker_results: list[WorkerResult]) -> str:
        """Combine all worker outputs into a streamed final summary."""
        # Truncate each result to keep synthesis prompt within token limits
        MAX_CHARS = 300
        findings_text = "\n\n".join(
            f"### Subtask: {r.task}\n{r.result[:MAX_CHARS]}{'…' if len(r.result) > MAX_CHARS else ''}"
            for r in worker_results
        )
        prompt = (
            f"Original goal: {goal}\n\n"
            f"Worker findings:\n{findings_text}\n\n"
            "Please synthesise the above into a final, cohesive response."
        )
        messages = [{"role": "user", "content": prompt}]
        logger.orchestrator("Streaming synthesis…")
        return self._synthesiser.stream(messages)
