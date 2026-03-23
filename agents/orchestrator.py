import json
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from typing import Any

from pydantic import BaseModel

import time
from agents.base import Maya, estimate_cost
from agents.worker import Nova, WorkerResult
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


class ChloeResult(BaseModel):
    goal: str
    subtasks: list[str]
    worker_results: list[WorkerResult]
    summary: str
    hr_legal_review: str = ""
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    duration_seconds: float = 0.0


class Chloe(Maya):
    """Decomposes a goal into subtasks, delegates to workers, and synthesises results."""

    def __init__(self, **kwargs) -> None:
        kwargs.setdefault("system_prompt", ORCHESTRATOR_SYSTEM_PROMPT)
        # Use Haiku for planning — only needs to output JSON, not quality prose
        kwargs.setdefault("model", "claude-haiku-4-5-20251001")
        super().__init__(**kwargs)
        self._aria_model = "claude-sonnet-4-6"
        self._aria_max_retries = self.max_retries
        self.stream_callback = None  # set externally (e.g. web SSE) to receive Aria chunks in real-time

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute(self, goal: str) -> ChloeResult:
        """Orchestrate workers to accomplish *goal* and return a full result."""
        _started = time.time()
        logger.orchestrator(f"Goal received: {goal}")

        subtasks = self._plan(goal)
        logger.orchestrator(f"Planned {len(subtasks)} subtask(s): {subtasks}")

        worker_results = self._dispatch(subtasks)

        # HR & Legal compliance review — runs concurrently, results injected into synthesis
        hr_legal_review = ""
        try:
            logger.orchestrator("Running HR & Legal compliance review…")
            hr_legal_review = self._review(goal, worker_results)
            logger.orchestrator("HR & Legal review complete.")
        except Exception as exc:
            logger.warning(f"HR & Legal review skipped: {exc}")

        summary = self._synthesise(goal, worker_results, review_notes=hr_legal_review)
        logger.orchestrator("Synthesis complete.")

        # Fix 9: feedback loop — verify goal is met, retry synthesis once if not
        if not self._evaluate(goal, summary):
            logger.orchestrator("Evaluation: goal not fully met — retrying synthesis with directive prompt…")
            summary = self._synthesise(goal, worker_results, review_notes=hr_legal_review, is_retry=True)
            logger.orchestrator("Retry synthesis complete.")

        from utils.memory import save_run as mem_save
        _duration_so_far = round(time.time() - _started, 2)
        mem_save(goal, subtasks, summary, duration_seconds=_duration_so_far)

        aria_in, aria_out, aria_cost = getattr(self, "_aria_usage", (0, 0, 0.0))
        total_in = sum(r.input_tokens for r in worker_results) + aria_in
        total_out = sum(r.output_tokens for r in worker_results) + aria_out
        total_cost = round(sum(r.cost_usd for r in worker_results) + aria_cost, 6)
        duration = round(time.time() - _started, 2)
        logger.orchestrator(f"Done in {duration}s — {total_in}in/{total_out}out tokens — est. ${total_cost:.5f}")

        # Fix 7: cost spike alert — notify if run exceeds threshold
        _COST_ALERT_USD = 0.10
        if total_cost > _COST_ALERT_USD:
            logger.warning(f"Cost alert: ${total_cost:.4f} exceeds ${_COST_ALERT_USD} threshold")
            try:
                from monitor.heal import _notify
                _notify("💰 MAP HQ", f"High-cost run: ${total_cost:.4f} — {goal[:50]}")
            except Exception:
                pass

        return ChloeResult(
            goal=goal,
            subtasks=subtasks,
            worker_results=worker_results,
            summary=summary,
            hr_legal_review=hr_legal_review,
            total_input_tokens=total_in,
            total_output_tokens=total_out,
            total_cost_usd=total_cost,
            duration_seconds=duration,
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
        from utils.router import route_task, ollama_available

        total = len(subtasks)
        logger.orchestrator(f"Dispatching {total} workers in parallel…")
        results: list[WorkerResult | None] = [None] * total

        # Fix 1: check Ollama once for all workers instead of once per worker
        ollama_up = ollama_available()

        # Fix 2: dynamic worker count — local tasks don't consume Anthropic rate limits
        routes = [route_task(task) for task in subtasks]
        api_count   = sum(1 for p, _ in routes if p != "local" or not ollama_up)
        local_count = total - api_count
        max_w = min(local_count, 5) + min(api_count, 2)
        max_w = max(max_w, 1)
        logger.orchestrator(f"Workers: {local_count} local (max 5) + {api_count} API (max 2) → pool={max_w}")

        def _run(index: int, task: str) -> tuple[int, WorkerResult]:
            worker = Nova(max_retries=self.max_retries, ollama_up=ollama_up)
            try:
                return index, worker.execute(task)
            except Exception as exc:
                logger.error(f"Worker failed for task '{task[:60]}': {exc}")
                from utils.memory import record_model_failure
                record_model_failure(task[:80], "unknown")
                return index, WorkerResult(task=task, result=f"[ERROR: {exc}]", model_used="failed")

        with ThreadPoolExecutor(max_workers=max_w) as pool:
            futures = {pool.submit(_run, i, task): i for i, task in enumerate(subtasks)}
            completed = 0
            # Fix 5: timeout so a hung worker (e.g. stalled Ollama) never blocks forever
            try:
                for future in as_completed(futures, timeout=120 * total):
                    index, result = future.result()
                    results[index] = result
                    completed += 1
                    logger.orchestrator(f"Worker {completed}/{total} done: {result.task[:60]}…")
            except FuturesTimeout:
                logger.error("Some workers timed out — marking remaining as failed")
                for future, idx in futures.items():
                    if not future.done():
                        results[idx] = WorkerResult(
                            task=subtasks[idx], result="[ERROR: worker timed out]", model_used="failed"
                        )

        final = [r for r in results if r is not None]

        # Fix 5: retry failed/thin workers with context from successful peers
        successful = [r for r in final if not r.result.startswith("[ERROR:") and len(r.result.strip()) >= 50]
        needs_retry = [(i, r) for i, r in enumerate(final) if r.result.startswith("[ERROR:") or len(r.result.strip()) < 50]
        if needs_retry and successful:
            context_block = "\n\n".join(f"[{r.task[:80]}]:\n{r.result[:600]}" for r in successful)
            logger.orchestrator(f"Retrying {len(needs_retry)} failed worker(s) with peer context…")
            for idx, failed_r in needs_retry:
                enriched = f"{failed_r.task}\n\n[Context from completed tasks — use if relevant]\n{context_block}"
                worker = Nova(max_retries=1, ollama_up=ollama_up)
                try:
                    final[idx] = worker.execute(enriched)
                    logger.orchestrator(f"Context-retry succeeded: {failed_r.task[:60]}")
                except Exception as exc:
                    logger.error(f"Context-retry also failed ({exc}): {failed_r.task[:60]}")

        return final

    def _review(self, goal: str, worker_results: list[WorkerResult]) -> str:
        """Route to the relevant compliance agents based on goal content.
        Only agents triggered by keywords are invoked — all run concurrently.
        Results cached in SQLite so identical goals never re-call the API."""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from utils.bus import bus, COMPLIANCE_TRIGGERS

        # Summarise work for review (lean for Haiku)
        work_summary = f"Goal: {goal}\n\n" + "\n\n".join(
            f"Task: {r.task}\nOutput: {r.result[:400]}" for r in worker_results[:6]
        )
        scan_text = (goal + " " + " ".join(r.task for r in worker_results)).lower()

        # Intelligent routing — only invoke agents triggered by content
        triggered = [
            key for key, keywords in COMPLIANCE_TRIGGERS.items()
            if any(kw in scan_text for kw in keywords)
        ]
        # data_privacy is always relevant for any digital work
        if "data_privacy" not in triggered:
            triggered.append("data_privacy")

        _LABELS = {
            "hr_compliance":   "👥 HR Compliance Officer",
            "employment_law":  "⚖️ Employment Law Attorney",
            "payroll":         "💰 Payroll & Benefits Officer",
            "data_privacy":    "🔒 Data Privacy & Security Officer",
            "workplace_safety":"🦺 Workplace Safety Officer",
        }
        _REVIEW_PROMPT = (
            "Review the following work and outputs. Run your full checklist. "
            "Use your output format (✅/⚠️/🚫 + statute cite + next steps).\n\n{summary}"
        )

        logger.orchestrator(f"Compliance routing → {', '.join(_LABELS.get(k, k) for k in triggered)}")

        results: dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=len(triggered)) as pool:
            futures = {
                pool.submit(bus.ask, _REVIEW_PROMPT.format(summary=work_summary), key): key
                for key in triggered
            }
            for future in as_completed(futures, timeout=60):
                key = futures[future]
                try:
                    results[key] = future.result()
                except Exception as exc:
                    results[key] = f"Review unavailable: {exc}"

        # Preserve a consistent agent order
        order = ["hr_compliance", "employment_law", "payroll", "data_privacy", "workplace_safety"]
        parts = []
        for key in order:
            if key in results:
                parts.append(f"**{_LABELS[key]}:**\n{results[key]}")

        return "\n\n---\n\n".join(parts)

    def _evaluate(self, goal: str, summary: str) -> bool:
        """Ask Haiku if the summary actually addresses the goal. Returns True if satisfied."""
        prompt = (
            f"Goal: {goal}\n\n"
            f"Delivered output (excerpt): {summary[:1000]}\n\n"
            "Does this output directly and completely address the goal? Reply YES or NO only."
        )
        try:
            answer = self.run([{"role": "user", "content": prompt}])
            return answer.strip().upper().startswith("YES")
        except Exception:
            return True  # on failure, assume OK rather than loop forever

    def _synthesise(self, goal: str, worker_results: list[WorkerResult],
                    review_notes: str = "", is_retry: bool = False) -> str:
        """Combine all worker outputs into a streamed final summary."""
        MAX_CHARS = 6000  # was 2000 — rich outputs (code, analysis) no longer truncated
        findings_parts = []
        failed_tasks = []
        for r in worker_results:
            is_error = r.result.startswith("[ERROR:")
            is_thin = len(r.result.strip()) < 50
            if is_error or is_thin:
                failed_tasks.append(r.task)
                findings_parts.append(f"### Subtask: {r.task}\n⚠️ UNRELIABLE — {r.result[:200]}")
            else:
                findings_parts.append(f"### Subtask: {r.task}\n{r.result[:MAX_CHARS]}{'…' if len(r.result) > MAX_CHARS else ''}")
        if failed_tasks:
            logger.warning(f"Quality gate: {len(failed_tasks)} unreliable result(s): {failed_tasks}")
        findings_text = "\n\n".join(findings_parts)
        compliance_section = (
            f"\n\n[HR & Legal Compliance Review]\n{review_notes}\n\n"
            "Where the compliance review flags real concerns, briefly acknowledge them in your synthesis."
            if review_notes else ""
        )
        prompt = (
            f"Original goal: {goal}\n\n"
            f"Worker findings:\n{findings_text}"
            f"{compliance_section}\n\n"
            "Please synthesise the above into a final, cohesive response."
        )
        # Build Aria with goal-aware system prompt for better synthesis quality
        retry_note = (
            "\n\nIMPORTANT: A previous synthesis attempt did not fully address the goal. "
            "This is your second attempt — be more thorough, specific, and directly answer every aspect of the goal."
            if is_retry else ""
        )
        goal_aware_prompt = (
            f"{SYNTHESISER_SYSTEM_PROMPT}\n\n"
            f"The user's original goal is: {goal}\n"
            f"Tailor your synthesis to directly and completely address this goal.{retry_note}"
        )
        aria = Maya(
            model=self._aria_model,
            system_prompt=goal_aware_prompt,
            max_retries=self._aria_max_retries,
        )
        messages = [{"role": "user", "content": prompt}]
        logger.orchestrator("Streaming synthesis…")
        # Fix 4: pass stream_callback so web UI receives Aria chunks in real-time
        text, aria_in, aria_out = aria.stream(messages, stream_callback=self.stream_callback)
        aria_cost = estimate_cost(self._aria_model, aria_in, aria_out)
        logger.orchestrator(f"Aria tokens: {aria_in}in/{aria_out}out — ${aria_cost:.5f}")
        self._aria_usage = (aria_in, aria_out, aria_cost)
        return text
