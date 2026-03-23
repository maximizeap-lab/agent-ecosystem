"""
agents/local_agent.py — Worker agent backed by a local Ollama model.

Uses Ollama's OpenAI-compatible API at http://localhost:11434/v1.
Falls back to Claude Haiku if Ollama is unreachable.
Tools are passed in OpenAI function-call format so Ollama can use them.
"""

import json
import os
from typing import Any

from utils import logger

OLLAMA_BASE_URL = "http://localhost:11434/v1"
WORKER_MAX_TOKENS = 1500


class Luna:
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
            self._fallback_client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        return self._fallback_client

    def run(self, messages: "list[dict[str, Any]]", tools: "list[dict] | None" = None) -> str:
        try:
            from agents.base import WORKER_TOOLS_OPENAI, _dispatch_tool
            client = self._get_client()
            formatted = [{"role": "system", "content": self.system_prompt}] + messages

            kwargs: dict[str, Any] = dict(
                model=self.model,
                messages=formatted,
                max_tokens=WORKER_MAX_TOKENS,
                temperature=0.3,
            )
            # Only pass tools if the model likely supports them (not phi3.5 / llama3.2)
            _NO_TOOL_MODELS = {"phi3.5", "phi3.5:latest", "llama3.2:3b"}
            if tools and self.model not in _NO_TOOL_MODELS:
                kwargs["tools"] = WORKER_TOOLS_OPENAI

            response = client.chat.completions.create(**kwargs)

            # OpenAI-format tool-use loop
            while response.choices[0].finish_reason == "tool_calls":
                msg = response.choices[0].message
                formatted.append(msg)
                tool_results = []
                for tc in (msg.tool_calls or []):
                    try:
                        inputs = json.loads(tc.function.arguments)
                    except Exception:
                        inputs = {}
                    result = _dispatch_tool(tc.function.name, inputs)
                    tool_results.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": result,
                    })
                formatted.extend(tool_results)
                response = client.chat.completions.create(**kwargs | {"messages": formatted})

            return response.choices[0].message.content or ""

        except Exception as exc:
            logger.warning(f"Local model {self.model} failed ({exc}) — falling back to Claude Haiku")
            return self._haiku_fallback(messages, tools)

    def _haiku_fallback(self, messages: "list[dict[str, Any]]", tools: "list[dict] | None") -> str:
        import anthropic
        from agents.base import _dispatch_tool, WORKER_TOOLS

        client = self._get_fallback_client()
        kwargs: "dict[str, Any]" = dict(
            model="claude-haiku-4-5-20251001",
            max_tokens=WORKER_MAX_TOKENS,
            system=[{"type": "text", "text": self.system_prompt, "cache_control": {"type": "ephemeral"}}],
            messages=messages,
        )
        if tools:
            kwargs["tools"] = WORKER_TOOLS

        response = client.messages.create(**kwargs)

        while response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = _dispatch_tool(block.name, block.input)
                    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            response = client.messages.create(**kwargs | {"messages": messages})

        return "".join(block.text for block in response.content if hasattr(block, "text"))
