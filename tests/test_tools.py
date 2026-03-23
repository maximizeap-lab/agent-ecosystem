"""
tests/test_tools.py — Unit tests for built-in agent tools.

Run: python3 -m pytest tests/ -v
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


class TestCodeSafety(unittest.TestCase):
    """Tests for AST-based run_code sandbox."""

    def setUp(self):
        from agents.base import _check_code_safety
        self.check = _check_code_safety

    def test_safe_code_passes(self):
        self.assertIsNone(self.check("x = 1 + 1\nprint(x)"))

    def test_safe_imports_pass(self):
        self.assertIsNone(self.check("import json\nimport math\nimport datetime"))

    def test_blocked_os_import(self):
        self.assertIsNotNone(self.check("import os"))

    def test_blocked_os_from_import(self):
        self.assertIsNotNone(self.check("from os import system"))

    def test_blocked_subprocess(self):
        self.assertIsNotNone(self.check("import subprocess"))

    def test_blocked_shutil(self):
        self.assertIsNotNone(self.check("import shutil"))

    def test_blocked_exec_call(self):
        self.assertIsNotNone(self.check("exec('print(1)')"))

    def test_blocked_eval_call(self):
        self.assertIsNotNone(self.check("eval('1+1')"))

    def test_blocked_compile_call(self):
        self.assertIsNotNone(self.check("compile('x=1', '<string>', 'exec')"))

    def test_blocked_builtins_subscript(self):
        self.assertIsNotNone(self.check("__builtins__['exec']('print(1)')"))

    def test_syntax_error_caught(self):
        result = self.check("def foo(:\n    pass")
        self.assertIsNotNone(result)
        self.assertIn("syntax error", result)


class TestPathTraversal(unittest.TestCase):
    """Tests for write_file path traversal protection."""

    def test_traversal_blocked(self):
        from agents.base import _dispatch_tool
        result = _dispatch_tool("write_file", {"filename": "../../.env", "content": "hacked"})
        self.assertIn("Error", result)
        self.assertIn("path traversal", result)

    def test_nested_traversal_blocked(self):
        from agents.base import _dispatch_tool
        result = _dispatch_tool("write_file", {"filename": "../../../etc/passwd", "content": "x"})
        self.assertIn("Error", result)

    def test_normal_filename_allowed(self):
        from agents.base import _dispatch_tool
        import tempfile, os
        # Patch ARTIFACTS_DIR to a temp dir so we don't pollute runs/
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch("agents.base._ARTIFACTS_DIR", Path(tmpdir)):
                result = _dispatch_tool("write_file", {"filename": "test_output.txt", "content": "hello"})
                self.assertIn("File written", result)
                self.assertTrue((Path(tmpdir) / "test_output.txt").exists())


class TestReadFile(unittest.TestCase):
    """Tests for read_file tool."""

    def test_missing_file_returns_error(self):
        from agents.base import _dispatch_tool
        result = _dispatch_tool("read_file", {"filename": "nonexistent_xyz.txt"})
        self.assertIn("Error", result)

    def test_read_existing_file(self):
        from agents.base import _dispatch_tool
        import tempfile
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "hello.txt"
            test_file.write_text("world")
            with patch("agents.base._ARTIFACTS_DIR", Path(tmpdir)):
                result = _dispatch_tool("read_file", {"filename": "hello.txt"})
                self.assertEqual(result, "world")


class TestRunCode(unittest.TestCase):
    """Tests for run_code tool execution."""

    def test_simple_math(self):
        from agents.base import _tool_run_code
        result = _tool_run_code("print(2 + 2)")
        self.assertIn("4", result)

    def test_timeout_message_on_infinite_loop(self):
        from agents.base import _tool_run_code
        result = _tool_run_code("while True: pass")
        self.assertIn("timed out", result.lower())

    def test_blocked_import_prevented(self):
        from agents.base import _tool_run_code
        result = _tool_run_code("import os\nos.system('echo hacked')")
        self.assertIn("Error", result)
        self.assertIn("blocked", result)


if __name__ == "__main__":
    unittest.main()
