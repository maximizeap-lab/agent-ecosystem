"""
utils/router.py — Routes tasks to the most efficient model.

Priority:
  1. Local Ollama models  (free, fast, ~80% of tasks)
  2. Claude Haiku         (low cost, ~15% of tasks)
  3. Claude Sonnet        (synthesis + planning only)

Local model assignment:
  deepseek-coder:6.7b  → code, implementation, API, tests, frontend, backend
  mistral:7b           → schemas, configs, database, JSON, structured output
  llama3.1:8b          → research, writing, design, UX
  phi3.5:mini          → documentation, guides, README
  gemma2:9b            → analysis, comparison, reasoning, strategy
  llama3.2:3b          → simple, fast, short tasks (fallback local)
"""

import re

# ── Local model routing rules (keyword → model) ───────────────────────────────
_CODE_KEYWORDS = re.compile(
    r"\b(implement|develop|write code|backend|frontend|endpoint|"
    r"function|class|component|unit test|integration test|test suite|"
    r"ci/cd|pipeline|deploy|dockerfile|script)\b"
    r"|(^|\s)(build|set up|create)\s.*(api|code|app|service|module|component)",
    re.IGNORECASE,
)

_SCHEMA_KEYWORDS = re.compile(
    r"\b(schema|database|data model|migration|seed|config|json|yaml|env|"
    r"postgresql|mongodb|sql|orm|table|column)\b",
    re.IGNORECASE,
)

_DESIGN_KEYWORDS = re.compile(
    r"(design|wireframe|ux|ui|layout|navigation|color|visual|dashboard view|"
    r"interface|mockup|prototype|user experience)",
    re.IGNORECASE,
)

_DOCS_KEYWORDS = re.compile(
    r"(documentation|document|readme|guide|tutorial|user manual|api reference|"
    r"setup instruction|how to|onboarding)",
    re.IGNORECASE,
)

_ANALYSIS_KEYWORDS = re.compile(
    r"\b(analys|compar|strateg|evaluat|assess|investigat|recommend|trend|insight|leaderboard)",
    re.IGNORECASE,
)

LOCAL_MODELS = {
    "code":     "deepseek-coder:6.7b",
    "schema":   "mistral:7b",
    "design":   "llama3.1:8b",
    "docs":     "phi3.5:mini",
    "analysis": "gemma2:9b",
    "default":  "llama3.2:3b",
}


def route_task(task: str) -> "tuple[str, str]":
    """
    Given a task description, return (provider, model).

    provider: 'local' | 'haiku' | 'sonnet'
    model:    model name string
    """
    if _ANALYSIS_KEYWORDS.search(task):
        return "local", LOCAL_MODELS["analysis"]
    if _CODE_KEYWORDS.search(task):
        return "local", LOCAL_MODELS["code"]
    if _SCHEMA_KEYWORDS.search(task):
        return "local", LOCAL_MODELS["schema"]
    if _DESIGN_KEYWORDS.search(task):
        return "local", LOCAL_MODELS["design"]
    if _DOCS_KEYWORDS.search(task):
        return "local", LOCAL_MODELS["docs"]
    return "local", LOCAL_MODELS["default"]


def ollama_available() -> bool:
    """Check if Ollama is running and reachable."""
    try:
        import httpx
        r = httpx.get("http://localhost:11434/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False
