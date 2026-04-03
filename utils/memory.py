"""
utils/memory.py — Persistent memory store for the MAP HQ.

Agents remember:
- Past goals and their subtask breakdowns (for pattern reuse)
- Which model worked best for each task type
- Run history with summaries, duration, and cost
- Specialist agent responses (persistent cache across sessions)
"""

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "runs" / "memory.db"
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con


def init_db() -> None:
    with _lock, _conn() as con:
        con.executescript("""
            CREATE TABLE IF NOT EXISTS runs (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                goal             TEXT NOT NULL,
                subtasks         TEXT NOT NULL,
                summary          TEXT NOT NULL,
                timestamp        TEXT NOT NULL,
                duration_seconds REAL DEFAULT 0,
                total_cost_usd   REAL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS model_performance (
                task_pattern  TEXT PRIMARY KEY,
                model         TEXT NOT NULL,
                success_count INTEGER DEFAULT 1,
                fail_count    INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS specialist_cache (
                cache_key  TEXT PRIMARY KEY,
                answer     TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS runs_fts
                USING fts5(goal, summary, content=runs, content_rowid=id);

            CREATE TABLE IF NOT EXISTS classification_cache (
                task      TEXT PRIMARY KEY,
                category  TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        # Migrate existing runs table if columns are missing
        existing = {row[1] for row in con.execute("PRAGMA table_info(runs)").fetchall()}
        if "duration_seconds" not in existing:
            con.execute("ALTER TABLE runs ADD COLUMN duration_seconds REAL DEFAULT 0")
        if "total_cost_usd" not in existing:
            con.execute("ALTER TABLE runs ADD COLUMN total_cost_usd REAL DEFAULT 0")


def save_run(goal: str, subtasks: "list[str]", summary: str,
             duration_seconds: float = 0, total_cost_usd: float = 0) -> int:
    init_db()
    with _lock, _conn() as con:
        cur = con.execute(
            "INSERT INTO runs (goal, subtasks, summary, timestamp, duration_seconds, total_cost_usd) VALUES (?, ?, ?, ?, ?, ?)",
            (goal, json.dumps(subtasks), summary, datetime.now().isoformat(), duration_seconds, total_cost_usd),
        )
        row_id = cur.lastrowid
        con.execute(
            "INSERT INTO runs_fts (rowid, goal, summary) VALUES (?, ?, ?)",
            (row_id, goal, summary),
        )
        return row_id


def recall_similar_goals(goal: str, limit: int = 3) -> "list[dict]":
    """Return past runs with similar goals — helps Chloe reuse good subtask patterns."""
    init_db()
    words = [w for w in goal.split() if len(w) > 3]
    if not words:
        return []
    fts_query = " OR ".join(words)
    try:
        with _lock, _conn() as con:
            rows = con.execute(
                """
                SELECT r.goal, r.subtasks, r.summary
                FROM runs r
                JOIN runs_fts f ON r.id = f.rowid
                WHERE runs_fts MATCH ?
                ORDER BY rank
                LIMIT ?
                """,
                (fts_query, limit),
            ).fetchall()
            return [
                {
                    "goal": r["goal"],
                    "subtasks": json.loads(r["subtasks"]),
                    "summary": r["summary"],
                }
                for r in rows
            ]
    except Exception:
        return []


def record_model_success(task_pattern: str, model: str) -> None:
    init_db()
    with _lock, _conn() as con:
        con.execute(
            """
            INSERT INTO model_performance (task_pattern, model, success_count)
            VALUES (?, ?, 1)
            ON CONFLICT(task_pattern) DO UPDATE SET success_count = success_count + 1, fail_count = 0
            """,
            (task_pattern, model),
        )


def record_model_failure(task_pattern: str, model: str) -> None:
    init_db()
    with _lock, _conn() as con:
        con.execute(
            """
            INSERT INTO model_performance (task_pattern, model, fail_count)
            VALUES (?, ?, 1)
            ON CONFLICT(task_pattern) DO UPDATE SET fail_count = fail_count + 1
            """,
            (task_pattern, model),
        )


# ── Classification cache (persistent across sessions) ────────────────────────

def get_classification_cache(task: str) -> "str | None":
    init_db()
    with _lock, _conn() as con:
        row = con.execute(
            "SELECT category FROM classification_cache WHERE task = ?", (task,)
        ).fetchone()
        return row["category"] if row else None


def set_classification_cache(task: str, category: str) -> None:
    init_db()
    with _lock, _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO classification_cache (task, category, created_at) VALUES (?, ?, ?)",
            (task, category, datetime.now().isoformat()),
        )


# ── Specialist cache (persistent across sessions) ─────────────────────────────

def get_specialist_cache(cache_key: str) -> "str | None":
    init_db()
    with _lock, _conn() as con:
        row = con.execute(
            "SELECT answer FROM specialist_cache WHERE cache_key = ? AND created_at > datetime('now', '-7 days')",
            (cache_key,),
        ).fetchone()
        return row["answer"] if row else None


def cleanup_expired_specialist_cache() -> int:
    """Delete specialist cache entries older than 7 days. Returns count deleted."""
    init_db()
    with _lock, _conn() as con:
        cur = con.execute(
            "DELETE FROM specialist_cache WHERE created_at <= datetime('now', '-7 days')"
        )
        return cur.rowcount


def set_specialist_cache(cache_key: str, answer: str) -> None:
    init_db()
    with _lock, _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO specialist_cache (cache_key, answer, created_at) VALUES (?, ?, ?)",
            (cache_key, answer, datetime.now().isoformat()),
        )


# ── Analytics ─────────────────────────────────────────────────────────────────

def get_analytics() -> dict:
    init_db()
    with _lock, _conn() as con:
        total_runs = con.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
        total_cost = con.execute("SELECT COALESCE(SUM(total_cost_usd), 0) FROM runs").fetchone()[0]
        avg_duration = con.execute("SELECT COALESCE(AVG(duration_seconds), 0) FROM runs WHERE duration_seconds > 0").fetchone()[0]
        model_stats = con.execute(
            "SELECT model, SUM(success_count) as wins, SUM(fail_count) as fails FROM model_performance GROUP BY model ORDER BY wins DESC"
        ).fetchall()
        recent_costs = con.execute(
            "SELECT DATE(timestamp) as day, SUM(total_cost_usd) as cost FROM runs GROUP BY day ORDER BY day DESC LIMIT 7"
        ).fetchall()
    return {
        "total_runs": total_runs,
        "total_cost_usd": round(total_cost, 6),
        "avg_duration_seconds": round(avg_duration, 1),
        "model_performance": [dict(r) for r in model_stats],
        "cost_last_7_days": [dict(r) for r in recent_costs],
    }


def get_model_failure_count(model: str) -> int:
    """Return total failure count for a model — used by router for auto-routing improvement."""
    init_db()
    with _lock, _conn() as con:
        row = con.execute(
            "SELECT COALESCE(SUM(fail_count), 0) FROM model_performance WHERE model = ?",
            (model,)
        ).fetchone()
        return int(row[0]) if row else 0


def get_all_runs(limit: int = 50) -> "list[dict]":
    init_db()
    with _lock, _conn() as con:
        rows = con.execute(
            "SELECT id, goal, summary, timestamp, duration_seconds, total_cost_usd FROM runs ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_run(run_id: int) -> "dict | None":
    init_db()
    with _lock, _conn() as con:
        row = con.execute(
            "SELECT * FROM runs WHERE id = ?", (run_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["subtasks"] = json.loads(d["subtasks"])
        return d
