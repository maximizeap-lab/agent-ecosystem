"""
tests/test_memory.py — Unit tests for SQLite memory store.

Uses a temp DB for every test — never touches runs/memory.db.

Run: python3 -m pytest tests/ -v
"""

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def _tmp_db():
    """Return a fresh temp DB path and patch DB_PATH for the test."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    return tmp.name


class TestSaveAndRecall(unittest.TestCase):

    def setUp(self):
        self.db_path = _tmp_db()
        self._patch = patch("utils.memory.DB_PATH", Path(self.db_path))
        self._patch.start()
        from utils.memory import init_db
        init_db()

    def tearDown(self):
        self._patch.stop()
        Path(self.db_path).unlink(missing_ok=True)

    def test_save_run_returns_id(self):
        from utils.memory import save_run
        rid = save_run("test goal", ["t1", "t2"], "summary")
        self.assertIsInstance(rid, int)
        self.assertGreater(rid, 0)

    def test_recall_similar_goals(self):
        from utils.memory import save_run, recall_similar_goals
        save_run("build a REST API", ["design endpoints", "write code"], "REST API summary")
        results = recall_similar_goals("REST API")
        self.assertGreater(len(results), 0)
        self.assertIn("REST", results[0]["goal"])

    def test_recall_empty_on_no_match(self):
        from utils.memory import recall_similar_goals
        results = recall_similar_goals("xyzzy_no_match_ever")
        self.assertEqual(results, [])

    def test_model_success_increments(self):
        from utils.memory import record_model_success, get_analytics
        record_model_success("write python code", "deepseek-coder:6.7b")
        record_model_success("write python code", "deepseek-coder:6.7b")
        analytics = get_analytics()
        perf = {r["model"]: r for r in analytics["model_performance"]}
        self.assertEqual(perf["deepseek-coder:6.7b"]["wins"], 2)

    def test_model_failure_increments(self):
        from utils.memory import record_model_failure, get_analytics
        record_model_failure("failing task", "some-model")
        analytics = get_analytics()
        perf = {r["model"]: r for r in analytics["model_performance"]}
        self.assertEqual(perf["some-model"]["fails"], 1)


class TestClassificationCache(unittest.TestCase):

    def setUp(self):
        self.db_path = _tmp_db()
        self._patch = patch("utils.memory.DB_PATH", Path(self.db_path))
        self._patch.start()
        from utils.memory import init_db
        init_db()

    def tearDown(self):
        self._patch.stop()
        Path(self.db_path).unlink(missing_ok=True)

    def test_cache_miss_returns_none(self):
        from utils.memory import get_classification_cache
        self.assertIsNone(get_classification_cache("never seen this task"))

    def test_set_then_get(self):
        from utils.memory import get_classification_cache, set_classification_cache
        set_classification_cache("write a python API", "code")
        result = get_classification_cache("write a python API")
        self.assertEqual(result, "code")

    def test_overwrite_updates_value(self):
        from utils.memory import get_classification_cache, set_classification_cache
        set_classification_cache("some task", "code")
        set_classification_cache("some task", "docs")
        self.assertEqual(get_classification_cache("some task"), "docs")


class TestSpecialistCache(unittest.TestCase):

    def setUp(self):
        self.db_path = _tmp_db()
        self._patch = patch("utils.memory.DB_PATH", Path(self.db_path))
        self._patch.start()
        from utils.memory import init_db
        init_db()

    def tearDown(self):
        self._patch.stop()
        Path(self.db_path).unlink(missing_ok=True)

    def test_miss_returns_none(self):
        from utils.memory import get_specialist_cache
        self.assertIsNone(get_specialist_cache("security::never asked"))

    def test_set_then_get(self):
        from utils.memory import get_specialist_cache, set_specialist_cache
        set_specialist_cache("security::JWT expiry", "Use 15 minutes for access tokens.")
        result = get_specialist_cache("security::JWT expiry")
        self.assertEqual(result, "Use 15 minutes for access tokens.")


if __name__ == "__main__":
    unittest.main()
