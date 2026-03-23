# MAP HQ — CLAUDE.md

## Session Start Instructions (ALWAYS follow these)

When starting any session in this project, Claude MUST:

1. **Run a health check immediately:**
   ```bash
   python3 scripts/launch.py --status
   ```
2. **If the API check fails** → run `python3 scripts/launch.py --heal` to auto-fix
3. **Check if Ollama is running** — if offline, start it with `brew services start ollama` (installed, managed by Homebrew)
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

## How Claude Uses MAP HQ (MANDATORY — not optional)

Claude must actively USE MAP HQ as an intelligent resource, not just maintain it.

### RULE 1 — Compliance pre-check before implementing anything involving:
- People, employees, contractors, hiring, firing, compensation
- Contracts, agreements, NDAs, offer letters
- Data collection, storage, user privacy, APIs that touch PII
- Workplace policies, safety, benefits

**Action:** Run `python3 scripts/launch.py --compliance "describe what is being built/changed"` BEFORE writing any code or making any decision. Do not proceed until review is complete.

### RULE 2 — Route complex research goals through MAP HQ:
When Peter asks a question requiring research across multiple angles (market analysis, technical comparison, strategy), run it through MAP HQ first:
```bash
python3 scripts/launch.py "your research goal here"
```
MAP HQ parallelises the work across specialist workers with web search, local LLMs, and specialist agents. Claude then builds on MAP HQ's output rather than working alone.

### RULE 3 — Use MAP HQ for complex multi-step implementation goals:
When a task has 3+ independent components (e.g. "build a billing system"), run the goal through MAP HQ to get Chloe's plan and worker outputs, then execute or refine from that foundation.

### RULE 4 — Consult compliance specialists mid-task when needed:
If Claude encounters a decision point involving legal, HR, payroll, data privacy, or safety mid-implementation, run a targeted compliance check rather than guessing.

### WHEN Claude acts directly (no MAP HQ needed):
- Single-file edits, bug fixes, refactors
- Code review, reading files, answering questions
- Git operations, running tests
- Any task that is purely technical with no people/legal/data dimensions

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
| **HR Dept** | specialist via `bus.py` | Reviews every run for HR compliance, fairness, privacy | Claude Haiku |
| **Legal Dept** | specialist via `bus.py` | Reviews every run for legal compliance, liability, regulation | Claude Haiku |

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
| docs | phi3.5 | Local |
| analysis | gemma2:9b | Local |
| other / unmatched | claude-haiku-4-5 | Anthropic |
| planning | claude-haiku-4-5 | Anthropic |
| synthesis | claude-sonnet-4-6 | Anthropic |

## Key Commands

```bash
# Web dashboard (local)
python3 web/app.py            # open http://localhost:8000
                              # Mobile: http://localhost:8000/m

# Mobile PWA (always-on via Vercel)
# https://agent-ecosystem-five.vercel.app
# Set ANTHROPIC_API_KEY + MOBILE_ACCESS_TOKEN in Vercel env vars

# Ollama (managed by Homebrew — auto-starts on login)
brew services start ollama    # start
brew services stop ollama     # stop
brew services list | grep ollama  # check status
ollama list                   # show installed models

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
```

## Worker Tools

| Tool | What it does |
|------|-------------|
| `write_file` | Writes real deliverables to `runs/artifacts/` |
| `read_file` | Reads previously written artifacts |
| `web_search` | DuckDuckGo search — no API key needed |
| `run_code` | Executes Python code, returns output (15s timeout) |
| `ask_specialist` | Consults a specialist agent (security/architecture/database/devops/frontend/performance) |

## HR & Legal Department

Every run automatically passes through a concurrent HR and Legal compliance review after workers complete but before Aria synthesises:

- **HR Review** — flags fairness, discrimination, bias, data privacy, employee rights concerns
- **Legal Review** — flags GDPR/CCPA, IP, regulatory compliance, liability concerns
- Results are injected into Aria's synthesis so the final output explicitly addresses any concerns
- Both reviews are cached in SQLite — same goal never re-calls the API
- Shown in the dedicated **HR & Legal tab** in the web dashboard
- Workers can also call `ask_specialist(specialist="hr")` or `ask_specialist(specialist="legal")` mid-task

## Agent-to-Agent Communication (utils/bus.py)

Workers can consult specialists mid-task via `ask_specialist` tool. The bus spins up a
Maya (Claude Haiku) specialist with a domain-specific system prompt. Results are cached to avoid
duplicate calls.

Available specialists: `security`, `architecture`, `database`, `devops`, `frontend`, `performance`, `hr`, `legal`

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

## Deployment

**Vercel (mobile PWA + Claude chat — always-on):**
- URL: `https://agent-ecosystem-five.vercel.app`
- Serves: `public/app.html` (mobile PWA with login, chat, run tab)
- Edge function: `api/chat.js` — streams Claude Sonnet directly from Vercel's edge network
- Required env vars in Vercel dashboard: `ANTHROPIC_API_KEY`, `MOBILE_ACCESS_TOKEN`
- To redeploy: `vercel --prod` or push to main (if GitHub integration is active)

**GitHub:**
- Remote: `https://github.com/maximizeap-lab/agent-ecosystem.git`
- Branch: `main`

**Local FastAPI dashboard:**
- `python3 web/app.py` → `http://localhost:8000` (desktop) + `/m` (mobile)
- Expose via Cloudflare tunnel: `bash scripts/start_tunnel.sh`

## Heartbeat / Daemon (launchd)

A macOS **launchd** job runs the heal daemon 24/7:
- **Plist:** `~/Library/LaunchAgents/com.petergirgis.map-hq.plist`
- **Auto-starts:** on every Mac login
- **Auto-restarts:** on crash (30s cooldown)
- **Health check:** every 24 hours — pings Anthropic API
- **Logs:** `logs/daemon.log` + `logs/daemon.error.log`

```bash
launchctl list | grep map-hq        # check status
tail -f logs/daemon.log                      # live log
launchctl unload ~/Library/LaunchAgents/com.petergirgis.map-hq.plist  # stop
launchctl load ~/Library/LaunchAgents/com.petergirgis.map-hq.plist    # start
```

## File Structure

```
map-hq/
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
    └── com.petergirgis.map-hq.plist  # macOS launchd heartbeat
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
11. **Real quality evaluation** — `_evaluate_worker_output()` uses Haiku to assess borderline outputs (replaces the 50-char threshold); fast-path heuristics skip the API call for obvious pass/fail
12. **Full cost visibility** — Aria (Sonnet) token usage tracked via stream(), included in run totals
13. **Single Ollama health check** — `ollama_available()` called once per run in Chloe, passed to all workers (not per-worker)
14. **Persistent classification cache** — task→category mapping stored in SQLite; survives process restarts (backed by lru_cache in-process)
15. **Worker timeout** — hung workers (e.g. stalled Ollama) killed after 120s/worker; run continues with error result
16. **Safe message handling** — `run_with_usage()` works on a copy of the messages list; caller's list never mutated
17. **Worker result sharing** — failed/low-quality workers are retried with context from successful peers injected into their prompt
18. **Feedback loop** — after synthesis, Chloe evaluates if goal was met; retries Aria with directive prompt if not
19. **SSE synthesis streaming** — Aria's output streams chunk-by-chunk to web UI via `stream_callback`; Summary tab fills in real-time
20. **Free health pings** — `models.list()` replaces `messages.create()` in all 3 health check locations (no tokens spent)
21. **Cost spike alerting** — macOS notification + log warning when any run exceeds $0.10
22. **AST-based sandbox** — `run_code` uses `ast.parse()` to block dangerous imports/calls; prevents known string-matching bypasses
23. **Path traversal protection** — `write_file` resolves path and rejects anything outside `runs/artifacts/`
24. **39 unit tests** — `tests/` covers tools (safety, path traversal, execution), router, and memory
25. **Compliance pre-check on plan** — before any workers start, `_review_plan()` runs compliance agents against the planned subtasks; 🚫 critical issues abort the run entirely before any work is done
26. **Human-in-the-loop checkpoint** — after plan generation, `approval_callback` pauses execution and presents an editable plan in the web dashboard; user can accept, edit subtasks, or cancel (5-min timeout auto-approves)
27. **Hierarchical sub-orchestrators** — `_is_complex_task()` detects multi-component tasks; `_dispatch_subtask()` spawns a child `Chloe` for those tasks (depth-limited to 1 level to prevent runaway recursion)
28. **Auto-routing improvement** — `route_task()` checks `get_model_failure_count(model)` before sending to a local model; if 3+ recorded failures, falls back to Haiku automatically

## Security

- `run_code` tool is sandboxed: AST-based check blocks `import os/subprocess/shutil/sys`, `exec/eval/compile()` calls, and `__builtins__` subscript bypasses; temp dir isolation; minimal env (no secrets exposed)
- `write_file` resolves path with `.resolve()` and rejects any filename that escapes `runs/artifacts/` (path traversal protection)
- Web dashboard `/run` endpoint protected by HTTP Basic Auth when `DASHBOARD_API_KEY` is set
- `.env` is gitignored — never committed

## Tests

Run: `python3 -m unittest discover -s tests -v`
- `tests/test_tools.py` — sandbox safety, path traversal, write_file, read_file, run_code
- `tests/test_router.py` — route_task for all categories, ollama_available()
- `tests/test_memory.py` — save/recall runs, model tracking, classification cache, specialist cache

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
- `MOBILE_ACCESS_TOKEN` in `.env` and Vercel env vars (optional — protects mobile endpoints)
- Ollama at `http://localhost:11434` — **installed via Homebrew** (`brew install ollama`), managed as a service (`brew services start ollama`), auto-starts on login
