"""
utils/router.py — Routes tasks to the most efficient model.

Priority:
  1. Local Ollama models  (free, fast, ~80% of tasks)
  2. Claude Haiku         (low cost, fallback + unmatched tasks)
  3. Claude Sonnet        (synthesis + planning only)

Local model assignment:
  deepseek-coder:6.7b  → code, implementation, API, tests, frontend, backend
  mistral:7b           → schemas, configs, database, JSON, structured output
  llama3.1:8b          → research, writing, design, UX
  phi3.5:mini          → documentation, guides, README
  gemma2:9b            → analysis, comparison, reasoning, strategy

Classification is done via a fast Claude Haiku call for accuracy.
Results are cached in-process to avoid duplicate API calls.
"""

import os
from functools import lru_cache

LOCAL_MODELS = {
    "code":     "deepseek-coder:6.7b",
    "schema":   "mistral:7b",
    "design":   "llama3.1:8b",
    "docs":     "phi3.5:mini",
    "analysis": "gemma2:9b",
}

_CLASSIFY_PROMPT = """\
Classify the following task into exactly one category. Reply with only the category name, nothing else.

Categories:
- code       (writing code, APIs, tests, scripts, deployment, CI/CD)
- schema     (database schemas, configs, JSON/YAML, migrations, data models)
- design     (UI/UX, wireframes, layouts, visual design, user experience)
- docs       (documentation, README, guides, tutorials, onboarding)
- analysis   (research, comparison, strategy, evaluation, recommendations)
- other      (anything that doesn't fit the above)

Task: {task}

Category:"""


@lru_cache(maxsize=256)
def _classify(task: str) -> str:
    """Classify a task. Checks SQLite cache first, then calls Haiku. In-process lru_cache on top."""
    try:
        from utils.memory import get_classification_cache, set_classification_cache
        cached = get_classification_cache(task)
        if cached:
            return cached
    except Exception:
        pass  # DB unavailable — fall through to API call

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": _CLASSIFY_PROMPT.format(task=task)}],
        )
        category = resp.content[0].text.strip().lower()
        result = category if category in LOCAL_MODELS else "other"
    except Exception:
        result = "other"

    try:
        set_classification_cache(task, result)
    except Exception:
        pass
    return result


def route_task(task: str) -> "tuple[str, str]":
    """
    Given a task description, return (provider, model).

    provider: 'local' | 'haiku'
    model:    model name string
    """
    category = _classify(task)
    if category in LOCAL_MODELS:
        return "local", LOCAL_MODELS[category]
    return "haiku", "claude-haiku-4-5-20251001"


def ollama_available() -> bool:
    """Check if Ollama is running and reachable."""
    try:
        import httpx
        r = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False
