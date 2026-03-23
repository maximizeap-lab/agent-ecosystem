# Agent Ecosystem — CLAUDE.md

## Session Start Instructions (ALWAYS follow these)

When starting any session in this project, Claude MUST:

1. **Run a health check immediately:**
   ```bash
   python3 scripts/launch.py --status
   ```
2. **If the API check fails** → run `python3 scripts/launch.py --heal` to auto-fix
3. **Check if Ollama is running** — if offline, remind the user to run `ollama serve`
4. **Read this file** before making any code changes — all architecture decisions are documented here
5. **Never change the model routing** in `utils/router.py` without checking the routing table in this file first
6. **Always run imports check after edits:**
   ```bash
   python3 -c "from agents.orchestrator import OrchestratorAgent; print('OK')"
   ```
7. **After any session with code/config changes** — remind Peter to commit and push:
   ```bash
   git add -A && git commit -m "describe changes" && git push
   ```
   The Stop hook will automatically surface this reminder if uncommitted changes exist.

## Project Overview
A world-class multi-agent orchestration framework built on the Anthropic Claude API.
Decomposes goals into subtasks, routes them to the most efficient model, and synthesises results.

## Architecture

```
OrchestratorAgent (Claude Haiku — planning)
    └── WorkerAgent × N  (routed via utils/router.py)
            ├── Local Ollama models  (~80% of tasks, free)
            ├── Claude Haiku         (~15% of tasks, low cost)
            └── Fallback only
    └── SynthesiserAgent (Claude Sonnet — final output, streamed)
```

## Model Routing (utils/router.py)

| Task Type               | Model                  | Provider |
|-------------------------|------------------------|----------|
| Code / API / Tests      | deepseek-coder:6.7b    | Local    |
| Schema / DB / Config    | mistral:7b             | Local    |
| Design / UX / Writing   | llama3.1:8b            | Local    |
| Docs / Guides           | phi3.5:mini            | Local    |
| Analysis / Research     | gemma2:9b              | Local    |
| Simple / Fast           | llama3.2:3b            | Local    |
| Fallback (Ollama down)  | claude-haiku-4-5       | Anthropic|
| Planning                | claude-haiku-4-5       | Anthropic|
| Synthesis               | claude-sonnet-4-6      | Anthropic|

## Key Commands

```bash
# Web dashboard (recommended)
python3 web/app.py            # open http://localhost:8000

# CLI — run a goal
python3 scripts/launch.py "your goal here"
python3 scripts/launch.py --status
python3 scripts/launch.py --heal

# Batch mode (no rate limits, 50% cheaper, async)
python3 scripts/batch_run.py "your goal here"
python3 scripts/batch_run.py --check <batch_id>
python3 scripts/batch_run.py --results <batch_id>

# Self-healing daemon (health check once/day)
python3 monitor/heal.py --daemon
python3 monitor/heal.py --once

# Setup local models (first time only, ~25GB, 20-30 min)
bash scripts/setup_ollama.sh
```

## Worker Tools

| Tool | What it does |
|------|-------------|
| `write_file` | Writes real deliverables to `runs/artifacts/` |
| `read_file` | Reads previously written artifacts |
| `web_search` | DuckDuckGo search — no API key needed |
| `run_code` | Executes Python code, returns output (15s timeout) |
| `ask_specialist` | Consults a specialist agent (security/architecture/database/devops/frontend/performance) |

## Agent-to-Agent Communication (utils/bus.py)

Workers can consult specialists mid-task via `ask_specialist` tool. The bus spins up a
Claude Haiku specialist with a domain-specific system prompt. Results are cached to avoid
duplicate calls.

## Memory (utils/memory.py)

SQLite database at `runs/memory.db`:
- Stores all run goals, subtasks, and summaries
- Full-text search on past goals — orchestrator uses similar past runs to improve planning
- Model performance tracking (success/fail per task pattern)

## File Structure

```
agent-ecosystem/
├── agents/
│   ├── base.py           # BaseAgent — prompt caching, tool loop, streaming, 5 tools
│   ├── orchestrator.py   # Plans (Haiku+memory), parallel workers, streams synthesis
│   ├── worker.py         # Routes tasks via router, executes with full tool suite
│   └── local_agent.py    # Ollama-backed worker with Claude Haiku fallback
├── utils/
│   ├── logger.py         # Rich-colored console output
│   ├── router.py         # Keyword-based task → model routing (6 local models)
│   ├── storage.py        # Persist runs to runs/<timestamp>.json
│   ├── memory.py         # SQLite memory — past runs, pattern learning
│   └── bus.py            # Agent-to-agent message bus with specialist agents
├── web/
│   ├── app.py            # FastAPI server — SSE live feed, run history, artifact viewer
│   └── static/
│       └── index.html    # Dashboard UI
├── monitor/
│   └── heal.py           # Daily health check daemon, worker retry, failure alerts
├── scripts/
│   ├── launch.py         # CLI entry point (--status, --heal flags)
│   ├── batch_run.py      # Anthropic Batch API — async, no rate limits, 50% cheaper
│   └── setup_ollama.sh   # Install Ollama + pull all 6 local models
├── runs/
│   ├── artifacts/        # Files written by workers (code, configs, docs, etc.)
│   ├── batches/          # Batch API metadata
│   └── memory.db         # SQLite memory store
└── logs/
    └── heal.log          # Persistent daemon log
```

## Efficiency Stack

1. **Local LLMs first** — Ollama routes ~80% of worker tasks to free local models
2. **Prompt caching** — Anthropic system prompts cached (ephemeral, 5 min) to reduce input tokens
3. **Token caps** — Workers capped at 1500 tokens (not 4096) to stay within rate limits
4. **Parallel workers** — 2 concurrent workers (limited by Tier 1 rate limits; increase when on Tier 2)
5. **Batch API** — For non-urgent runs: no rate limits, 50% cost reduction
6. **Model tiering** — Haiku for planning, Sonnet only for synthesis

## Rate Limits (Anthropic Tier 1)
- 8,000 output tokens/min
- 30,000 input tokens/min
- Upgrade path: reach $50 cumulative spend → Tier 2 (10x limits)

## Environment
- Python 3.9.6
- `ANTHROPIC_API_KEY` in `.env`
- Ollama at `http://localhost:11434` (optional but recommended)
