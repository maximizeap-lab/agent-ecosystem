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
   python3 -c "from agents.orchestrator import Chloe; print('OK')"
   ```
7. **After any session with code/config changes** — update this file (CLAUDE.md) to reflect what changed, then commit and push:
   ```bash
   git add -A && git commit -m "describe changes" && git push
   ```
   The Stop hook will automatically surface this reminder if uncommitted changes exist.

## Who Keeps CLAUDE.md Updated

**Claude is responsible for keeping this file current.**

Rules:
- Any time a class is renamed → update the Agent Names table
- Any time routing logic changes → update the Model Routing table
- Any time a new feature is added → add it to the relevant section
- Any time a new file is created → add it to File Structure
- Any time a config value changes (token caps, worker count, intervals) → update here
- Any time a new hook or launchd job is added → update Heartbeat section
- Never end a session with code changes without updating this file first

## CLAUDE.md Backup

Every session end, the Stop hook **automatically** backs up CLAUDE.md to:
```
~/Desktop/claude md backup/CLAUDE_<timestamp>.md
```
Backups are timestamped so no history is ever lost. No manual action needed.

## Project Overview
A world-class multi-agent orchestration framework built on the Anthropic Claude API.
Decomposes goals into subtasks, routes them to the most efficient model, and synthesises results.

## Agent Names

| Name | Class | Role | Model |
|------|-------|------|-------|
| **Chloe** | `Chloe` (orchestrator.py) | Commander — plans & coordinates | Claude Haiku |
| **Aria** | internal `Maya` in Chloe | Voice — synthesises final output | Claude Sonnet |
| **Nova** | `Nova` (worker.py) | Executor — routes and runs tasks | Routed |
| **Luna** | `Luna` (local_agent.py) | Local runner — free, Ollama-backed | Ollama |
| **Maya** | `Maya` (base.py) | The mother — base class all agents inherit | — |

## Architecture

```
Chloe (Claude Haiku — planning)
    └── Nova × N  (routed via utils/router.py — Haiku classification)
            ├── Luna → Local Ollama models  (~80% of tasks, free)
            ├── Claude Haiku               (~20% fallback/unmatched)
            └── Fallback if Ollama offline
    └── Aria (Claude Sonnet — final output, streamed, goal-aware prompt)
```

## Model Routing (utils/router.py)

Routing uses a **Claude Haiku classification call** (cached) — not regex.
Haiku classifies each task into a category, then routes to the best local model.

| Category | Model | Provider |
|----------|-------|----------|
| code | deepseek-coder:6.7b | Local |
| schema | mistral:7b | Local |
| design | llama3.1:8b | Local |
| docs | phi3.5:mini | Local |
| analysis | gemma2:9b | Local |
| other / unmatched | claude-haiku-4-5 | Anthropic |
| planning | claude-haiku-4-5 | Anthropic |
| synthesis | claude-sonnet-4-6 | Anthropic |

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

# Self-healing daemon (managed by launchd — runs automatically)
python3 monitor/heal.py --daemon   # manual start (usually not needed)
python3 monitor/heal.py --once     # single health check

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
Maya (Claude Haiku) specialist with a domain-specific system prompt. Results are cached to avoid
duplicate calls.

## Memory (utils/memory.py)

SQLite database at `runs/memory.db`:
- Stores all run goals, subtasks, and summaries
- Full-text search on past goals — Chloe uses similar past runs to improve planning
- Model performance tracking (success/fail per task pattern)

## Cost & Token Tracking

Every run now tracks:
- Per-worker: `input_tokens`, `output_tokens`, `cost_usd`
- Per-run total: `total_input_tokens`, `total_output_tokens`, `total_cost_usd`
- Logged at end of each run and saved to `runs/<timestamp>.json`

Pricing used (per 1M tokens):
- Haiku: $0.80 input / $4.00 output
- Sonnet: $3.00 input / $15.00 output

## Web Dashboard Auth

`web/app.py` — POST `/run` is protected by HTTP Basic Auth when `DASHBOARD_API_KEY` is set in `.env`.
Leave blank for local dev. Set a password before deploying.

## Heartbeat / Daemon (launchd)

A macOS **launchd** job runs the heal daemon 24/7:
- **Plist:** `~/Library/LaunchAgents/com.petergirgis.agent-ecosystem.plist`
- **Auto-starts:** on every Mac login
- **Auto-restarts:** on crash (30s cooldown)
- **Health check:** every 24 hours — pings Anthropic API
- **Logs:** `logs/daemon.log` + `logs/daemon.error.log`

```bash
launchctl list | grep agent-ecosystem        # check status
tail -f logs/daemon.log                      # live log
launchctl unload ~/Library/LaunchAgents/com.petergirgis.agent-ecosystem.plist  # stop
launchctl load ~/Library/LaunchAgents/com.petergirgis.agent-ecosystem.plist    # start
```

## File Structure

```
agent-ecosystem/
├── agents/
│   ├── base.py           # Maya — prompt caching, tool loop, streaming, cost tracking
│   ├── orchestrator.py   # Chloe — plans (Haiku+memory), parallel Nova workers, Aria synthesis
│   ├── worker.py         # Nova — routes tasks via router, executes with full tool suite
│   └── local_agent.py    # Luna — Ollama-backed worker with Claude Haiku fallback
├── utils/
│   ├── logger.py         # Rich-colored console output
│   ├── router.py         # Haiku-classified task → model routing (cached)
│   ├── storage.py        # Persist runs to runs/<timestamp>.json (with token/cost data)
│   ├── memory.py         # SQLite memory — past runs, pattern learning
│   └── bus.py            # Agent-to-agent message bus with specialist agents
├── web/
│   ├── app.py            # FastAPI server — SSE live feed, run history, artifact viewer, auth
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
├── logs/
│   ├── heal.log          # Persistent daemon log
│   ├── daemon.log        # launchd stdout
│   └── daemon.error.log  # launchd stderr
├── README.md             # Public-facing project documentation
└── ~/Library/LaunchAgents/
    └── com.petergirgis.agent-ecosystem.plist  # macOS launchd heartbeat
```

## Efficiency Stack

1. **Local LLMs first** — Luna routes ~80% of worker tasks to free local models
2. **Haiku classification** — Smart routing via cached Haiku call (not fragile regex)
3. **Prompt caching** — Anthropic system prompts cached (ephemeral, 5 min) to reduce input tokens
4. **Token caps** — Workers capped at 1500 tokens to stay within rate limits
5. **Partial results** — Failed workers save `[ERROR]` result, run continues without crashing
6. **Dynamic worker pool** — Local tasks run at up to 5 concurrent; API tasks capped at 2 (rate limit); pool size auto-calculated per run
7. **Batch API** — For non-urgent runs: no rate limits, 50% cost reduction
8. **Goal-aware synthesis** — Aria receives the original goal in her system prompt for better output
9. **Persistent specialist cache** — bus.py caches specialist answers in SQLite across sessions
10. **Luna tool support** — OpenAI function-call format tools for Ollama models (write_file, read_file, web_search, run_code); phi3.5 and llama3.2 excluded as they don't support tool calls
11. **Quality gate** — Chloe scans worker results for errors/thin output and flags them to Aria
12. **Full cost visibility** — Aria (Sonnet) token usage tracked via stream(), included in run totals
13. **Single Ollama health check** — `ollama_available()` called once per run in Chloe, passed to all workers (not per-worker)
14. **Persistent classification cache** — task→category mapping stored in SQLite; survives process restarts (backed by lru_cache in-process)
15. **Worker timeout** — hung workers (e.g. stalled Ollama) killed after 120s/worker; run continues with error result
16. **Safe message handling** — `run_with_usage()` works on a copy of the messages list; caller's list never mutated

## Security

- `run_code` tool is sandboxed: blocked patterns (os.system, subprocess, shutil.rmtree), temp dir isolation, minimal env (no secrets exposed)
- Web dashboard `/run` endpoint protected by HTTP Basic Auth when `DASHBOARD_API_KEY` is set
- `.env` is gitignored — never committed

## Observability

- Per-run: `duration_seconds`, `total_cost_usd`, `total_input_tokens`, `total_output_tokens` in both JSON files and SQLite
- Per-worker: `model_used`, `input_tokens`, `output_tokens`, `cost_usd` in `WorkerResult`
- Model performance table: `success_count` / `fail_count` per task pattern — wired into Nova
- Analytics endpoint: `GET /analytics` returns totals, model performance, cost per day
- Web dashboard Analytics tab shows all of the above
- macOS desktop notifications on API health check failure and repeated worker failures

## Rate Limits (Anthropic Tier 1)
- 8,000 output tokens/min
- 30,000 input tokens/min
- Upgrade path: reach $50 cumulative spend → Tier 2 (10x limits)

## Environment
- Python 3.9.6
- `ANTHROPIC_API_KEY` in `.env`
- `DASHBOARD_API_KEY` in `.env` (optional — protects web dashboard)
- Ollama at `http://localhost:11434` (optional but recommended)
