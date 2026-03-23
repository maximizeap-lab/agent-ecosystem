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
    "default":      "You are a helpful expert. Answer concisely and practically.",
}


class AgentBus:
    """Thread-safe bus for agent-to-agent consultation."""

    def __init__(self) -> None:
        self._cache: "dict[str, str]" = {}

    def ask(self, question: str, specialist: str = "default") -> str:
        """
        Ask a specialist agent a question. Results are cached — identical
        questions don't spawn duplicate workers.
        """
        cache_key = f"{specialist}::{question}"
        with _lock:
            if cache_key in self._cache:
                return self._cache[cache_key]

        # Import here to avoid circular imports
        from agents.base import BaseAgent

        system_prompt = SPECIALIST_PROMPTS.get(specialist, SPECIALIST_PROMPTS["default"])
        agent = BaseAgent(
            model="claude-haiku-4-5-20251001",
            system_prompt=system_prompt,
        )
        answer = agent.run([{"role": "user", "content": question}])

        with _lock:
            self._cache[cache_key] = answer

        return answer


# Global singleton — all workers share this bus
bus = AgentBus()
