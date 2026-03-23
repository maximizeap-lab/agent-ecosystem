"""
agents/local_agent.py — Worker agent backed by a local Ollama model.

Uses Ollama's OpenAI-compatible API at http://localhost:11434/v1.
Falls back to Claude Haiku if Ollama is unreachable.
"""

import os
from typing import Any

from utils import logger

OLLAMA_BASE_URL = "http://localhost:11434/v1"
WORKER_MAX_TOKENS = 1500


class LocalAgent:
    """Runs tasks against a local Ollama model. Falls back to Claude Haiku on failure."""

    def __init__(self, model: str, system_prompt: str = "You are a helpful assistant.") -> None:
        self.model = model
        self.system_prompt = system_prompt
        self._client = None
        self._fallback_client = None

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI
            self._client = OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")
        return self._client

    def _get_fallback_client(self):
        if self._fallback_client is None:
            import anthropic
            self._fallback_client = anthropic.Anthropic(
                api_key=os.environ["ANTHROPIC_API_KEY"]
            )
        return self._fallback_client

    def run(self, messages: "list[dict[str, Any]]", tools: "list[dict] | None" = None) -> str:
        try:
            client = self._get_client()
            formatted = [{"role": "system", "content": self.system_prompt}] + messages
            response = client.chat.completions.create(
                model=self.model,
                messages=formatted,
                max_tokens=WORKER_MAX_TOKENS,
                temperature=0.3,
            )
            return response.choices[0].message.content or ""

        except Exception as exc:
            logger.warning(f"Local model {self.model} failed ({exc}) — falling back to Claude Haiku")
            return self._haiku_fallback(messages, tools)

    def _haiku_fallback(self, messages: "list[dict[str, Any]]", tools: "list[dict] | None") -> str:
        import anthropic
        from agents.base import _dispatch_tool

        client = self._get_fallback_client()
        kwargs: "dict[str, Any]" = dict(
            model="claude-haiku-4-5-20251001",
            max_tokens=WORKER_MAX_TOKENS,
            system=[{
                "type": "text",
                "text": self.system_prompt,
                "cache_control": {"type": "ephemeral"},
            }],
            messages=messages,
        )
        if tools:
            kwargs["tools"] = tools

        response = client.messages.create(**kwargs)

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
            response = client.messages.create(**kwargs | {"messages": messages})

        return "".join(
            block.text for block in response.content if hasattr(block, "text")
        )
