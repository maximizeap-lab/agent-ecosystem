"""
utils/bus.py — Agent-to-agent message bus.

Workers can consult specialist agents mid-task:
    answer = bus.ask("What is the standard JWT expiry for a production API?", specialist="security")

The bus spins up a fresh WorkerAgent with a specialist system prompt to answer,
then returns the result to the calling worker.
"""

import threading
from typing import Any

_lock = threading.Lock()

SPECIALIST_PROMPTS = {
    "security":     "You are a security expert. Answer concisely and practically.",
    "architecture": "You are a software architect. Give concrete, opinionated recommendations.",
    "database":     "You are a database expert (SQL and NoSQL). Answer with schema/query examples.",
    "devops":       "You are a DevOps/infrastructure expert. Answer with config examples.",
    "frontend":     "You are a frontend expert (React/TypeScript). Answer with code examples.",
    "performance":  "You are a performance engineering expert. Give specific, measurable advice.",
    "hr": (
        "You are a senior HR professional with deep expertise in employment law, workplace policy, "
        "diversity & inclusion, data privacy, and organisational ethics. "
        "When reviewing work or outputs: identify any concerns about fairness, discrimination, bias, "
        "employee rights, privacy, or HR policy violations. Be specific and actionable. "
        "If there are no concerns, say exactly: 'No HR concerns identified.' "
        "Do not give generic disclaimers — only flag real, specific issues."
    ),
    "legal": (
        "You are a senior corporate attorney with expertise in contract law, employment law, "
        "data privacy (GDPR, CCPA, HIPAA), intellectual property, regulatory compliance, "
        "and business liability. "
        "When reviewing work or outputs: identify specific legal risks, compliance gaps, or liability concerns. "
        "Reference applicable laws or regulations where relevant. Be concise and actionable. "
        "If there are no concerns, say exactly: 'No legal concerns identified.' "
        "Do not give generic disclaimers — only flag real, specific legal issues."
    ),
    "default":      "You are a helpful expert. Answer concisely and practically.",
}


class AgentBus:
    """Thread-safe bus for agent-to-agent consultation."""

    def __init__(self) -> None:
        self._cache: "dict[str, str]" = {}

    def ask(self, question: str, specialist: str = "default") -> str:
        """
        Ask a specialist agent a question. Results are cached persistently in SQLite —
        identical questions across sessions don't re-call the API.
        """
        cache_key = f"{specialist}::{question}"

        # Check in-memory cache first (fast path)
        with _lock:
            if cache_key in self._cache:
                return self._cache[cache_key]

        # Check persistent SQLite cache
        from utils.memory import get_specialist_cache, set_specialist_cache
        cached = get_specialist_cache(cache_key)
        if cached:
            with _lock:
                self._cache[cache_key] = cached
            return cached

        # Call API
        from agents.base import Maya
        system_prompt = SPECIALIST_PROMPTS.get(specialist, SPECIALIST_PROMPTS["default"])
        agent = Maya(model="claude-haiku-4-5-20251001", system_prompt=system_prompt)
        answer = agent.run([{"role": "user", "content": question}])

        # Persist to both caches
        set_specialist_cache(cache_key, answer)
        with _lock:
            self._cache[cache_key] = answer

        return answer


# Global singleton — all workers share this bus
bus = AgentBus()
