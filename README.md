# ⚡ Agent Ecosystem

A world-class multi-agent orchestration framework built on the Anthropic Claude API. Decomposes any goal into parallel subtasks, routes each to the most efficient model (local or cloud), and synthesises a final response — automatically, with full cost tracking and self-healing.

---

## Meet the Agents

| Name | Role | Model |
|------|------|-------|
| **Chloe** | Commander — plans goals into subtasks, queries memory | Claude Haiku |
| **Aria** | Voice — synthesises all worker output into a final response | Claude Sonnet |
| **Nova** | Executor — routes and runs each subtask | Routed |
| **Luna** | Local runner — free Ollama-backed worker | Local LLM |
| **Maya** | The mother — base class all agents inherit from | — |

---

## Architecture

```
                    ┌─────────────────┐
    CLI / Web UI ──▶│     Chloe        │ Claude Haiku (planning)
                    │  Orchestrator    │ ← queries memory for similar past goals
                    └────────┬────────┘
                             │ parallel subtasks
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          ┌───────┐      ┌───────┐      ┌───────┐
          │ Nova  │      │ Nova  │      │ Nova  │  Worker pool
          └───┬───┘      └───┬───┘      └───┬───┘
              │              │              │
         ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
         │  Luna   │    │  Luna   │    │  Haiku  │
         │ (local) │    │ (local) │    │(fallback│
         └─────────┘    └─────────┘    └─────────┘
                             │
                    ┌────────▼────────┐
                    │      Aria        │ Claude Sonnet (synthesis)
                    │   Synthesiser   │ ← goal-aware, streams output
                    └─────────────────┘
```

---

## Features

- **Smart routing** — Haiku classifies each task and routes to the best local model (free) or falls back to Haiku
- **Full tool support** — workers can `write_file`, `read_file`, `web_search`, `run_code`, `ask_specialist`
- **Persistent memory** — SQLite stores all runs with FTS search; Chloe learns from past goals
- **Cost tracking** — every token counted, every run costed, analytics dashboard included
- **Quality gate** — Chloe flags thin/failed worker results before Aria synthesises
- **Self-healing daemon** — launchd keeps the health monitor running 24/7, sends macOS alerts on failure
- **Specialist bus** — workers can consult expert agents mid-task (security, architecture, DB, DevOps, etc.)
- **Web dashboard** — live SSE feed, run history, artifact viewer, analytics, status

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/maximizeap-lab/agent-ecosystem
cd agent-ecosystem
pip install -r requirements.txt

# 2. Set your API key
cp .env.example .env
# edit .env and add your ANTHROPIC_API_KEY

# 3. (Optional but recommended) Install local models — ~25GB, 20-30 min
bash scripts/setup_ollama.sh
ollama serve

# 4. Run a goal
python3 scripts/launch.py "build a REST API for a todo app"

# 5. Or open the web dashboard
python3 web/app.py
# → http://localhost:8000
```

---

## Key Commands

```bash
python3 scripts/launch.py "your goal"     # run a goal via CLI
python3 scripts/launch.py --status        # health check
python3 scripts/launch.py --heal          # retry last failed goal

python3 web/app.py                        # web dashboard at :8000

python3 scripts/batch_run.py "goal"       # async batch (50% cheaper, no rate limits)
python3 scripts/batch_run.py --check <id>
python3 scripts/batch_run.py --results <id>

python3 monitor/heal.py --once            # single health check
python3 monitor/heal.py --daemon          # continuous monitor
```

---

## Local Models (via Ollama)

| Model | Specialty |
|-------|-----------|
| `deepseek-coder:6.7b` | Code, APIs, tests |
| `mistral:7b` | Schemas, configs, DB |
| `llama3.1:8b` | Design, writing, UX |
| `phi3.5:mini` | Docs, guides |
| `gemma2:9b` | Analysis, research |

When Ollama is offline, all tasks fall back to Claude Haiku automatically.

---

## Environment

```
ANTHROPIC_API_KEY=...       # required
DASHBOARD_API_KEY=...       # optional — protects /run endpoint when deployed
```

---

## Rate Limits (Tier 1)

- 8K output tokens/min · 30K input tokens/min
- Reach $50 cumulative spend → Tier 2 (10x limits) → increase `max_workers` beyond 2

---

Built with Python 3.9 · Anthropic SDK · Ollama · FastAPI · SQLite · Rich
