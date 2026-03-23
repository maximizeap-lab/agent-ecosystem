"""
tests/test_router.py — Unit tests for task routing logic.

Run: python3 -m pytest tests/ -v
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestRouteTask(unittest.TestCase):
    """Tests for route_task() — does not make real API calls."""

    def _route_with_category(self, category: str):
        """Helper: patch _classify to return a fixed category, then call route_task."""
        from utils import router
        with patch.object(router, "_classify", return_value=category):
            router._classify.cache_clear() if hasattr(router._classify, "cache_clear") else None
            return router.route_task(f"some task for category {category}")

    def test_code_routes_to_deepseek(self):
        provider, model = self._route_with_category("code")
        self.assertEqual(provider, "local")
        self.assertIn("deepseek", model)

    def test_schema_routes_to_mistral(self):
        provider, model = self._route_with_category("schema")
        self.assertEqual(provider, "local")
        self.assertIn("mistral", model)

    def test_design_routes_to_llama(self):
        provider, model = self._route_with_category("design")
        self.assertEqual(provider, "local")
        self.assertIn("llama", model)

    def test_docs_routes_to_phi(self):
        provider, model = self._route_with_category("docs")
        self.assertEqual(provider, "local")
        self.assertIn("phi", model)

    def test_analysis_routes_to_gemma(self):
        provider, model = self._route_with_category("analysis")
        self.assertEqual(provider, "local")
        self.assertIn("gemma", model)

    def test_other_routes_to_haiku(self):
        provider, model = self._route_with_category("other")
        self.assertEqual(provider, "haiku")
        self.assertIn("haiku", model)

    def test_unknown_category_falls_back_to_haiku(self):
        provider, model = self._route_with_category("gibberish")
        self.assertEqual(provider, "haiku")
        self.assertIn("haiku", model)


class TestOllamaAvailable(unittest.TestCase):
    """Tests for ollama_available() — mocked HTTP calls."""

    def test_returns_true_when_ollama_responds(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch("httpx.get", return_value=mock_resp):
            from utils.router import ollama_available
            self.assertTrue(ollama_available())

    def test_returns_false_when_ollama_offline(self):
        with patch("httpx.get", side_effect=Exception("connection refused")):
            from utils.router import ollama_available
            self.assertFalse(ollama_available())

    def test_returns_false_on_non_200(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        with patch("httpx.get", return_value=mock_resp):
            from utils.router import ollama_available
            self.assertFalse(ollama_available())


if __name__ == "__main__":
    unittest.main()
