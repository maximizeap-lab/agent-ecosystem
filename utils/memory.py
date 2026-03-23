"""
utils/memory.py — Persistent memory store for the agent ecosystem.

Agents remember:
- Past goals and their subtask breakdowns (for pattern reuse)
- Which model worked best for each task type
- Run history with summaries
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
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                goal      TEXT NOT NULL,
                subtasks  TEXT NOT NULL,
                summary   TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS model_performance (
                task_pattern TEXT PRIMARY KEY,
                model        TEXT NOT NULL,
                success_count INTEGER DEFAULT 1,
                fail_count    INTEGER DEFAULT 0
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS runs_fts
                USING fts5(goal, summary, content=runs, content_rowid=id);
        """)


def save_run(goal: str, subtasks: "list[str]", summary: str) -> int:
    init_db()
    with _lock, _conn() as con:
        cur = con.execute(
            "INSERT INTO runs (goal, subtasks, summary, timestamp) VALUES (?, ?, ?, ?)",
            (goal, json.dumps(subtasks), summary, datetime.now().isoformat()),
        )
        row_id = cur.lastrowid
        con.execute(
            "INSERT INTO runs_fts (rowid, goal, summary) VALUES (?, ?, ?)",
            (row_id, goal, summary),
        )
        return row_id


def recall_similar_goals(goal: str, limit: int = 3) -> "list[dict]":
    """Return past runs with similar goals — helps orchestrator reuse good subtask patterns."""
    init_db()
    # Build FTS query from significant words (skip short words)
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
            ON CONFLICT(task_pattern) DO UPDATE SET success_count = success_count + 1
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


def get_all_runs(limit: int = 50) -> "list[dict]":
    init_db()
    with _lock, _conn() as con:
        rows = con.execute(
            "SELECT id, goal, summary, timestamp FROM runs ORDER BY id DESC LIMIT ?",
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
