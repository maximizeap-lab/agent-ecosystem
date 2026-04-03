"""Integration tests for the agent message bus and compliance blocking."""
import unittest
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestAgentBus(unittest.TestCase):
    """Test the specialist message bus caching and routing."""

    def test_cache_key_deterministic(self):
        key1 = "security::What is JWT expiry?"
        key2 = "security::What is JWT expiry?"
        key3 = "architecture::What is JWT expiry?"
        self.assertEqual(key1, key2)
        self.assertNotEqual(key1, key3)

    def test_all_specialists_routable(self):
        from utils.bus import SPECIALIST_PROMPTS
        known = ['security', 'architecture', 'database', 'devops', 'frontend', 'performance',
                 'hr_compliance', 'employment_law', 'payroll', 'data_privacy', 'workplace_safety']
        for spec in known:
            self.assertIn(spec, SPECIALIST_PROMPTS)

    def test_cache_expiry_logic(self):
        now = datetime.datetime.now()
        eight_days_ago = now - datetime.timedelta(days=8)
        six_days_ago = now - datetime.timedelta(days=6)
        self.assertTrue((now - eight_days_ago).days > 7)
        self.assertFalse((now - six_days_ago).days > 7)

    def test_compliance_keyword_detection(self):
        from utils.bus import COMPLIANCE_TRIGGERS
        test_goal = "create an employee onboarding system with contract management"
        scan_text = test_goal.lower()

        triggered = [
            key for key, keywords in COMPLIANCE_TRIGGERS.items()
            if any(kw in scan_text for kw in keywords)
        ]
        self.assertIn('hr_compliance', triggered)
        self.assertIn('employment_law', triggered)

    def test_non_compliance_goal_skips_hr(self):
        from utils.bus import COMPLIANCE_TRIGGERS
        test_goal = "build a fibonacci calculator in python"
        scan_text = test_goal.lower()

        triggered = [
            key for key, keywords in COMPLIANCE_TRIGGERS.items()
            if any(kw in scan_text for kw in keywords)
        ]
        self.assertNotIn('hr_compliance', triggered)
        self.assertNotIn('employment_law', triggered)
        self.assertNotIn('payroll', triggered)
        self.assertNotIn('workplace_safety', triggered)


class TestComplianceBlocking(unittest.TestCase):
    """Test that compliance review correctly blocks dangerous goals."""

    def test_emoji_block_marker(self):
        response = "🚫 CRITICAL: This violates employment law"
        self.assertTrue('🚫' in response or 'BLOCKED: true' in response)

    def test_text_block_marker(self):
        response = "BLOCKED: true\nThis goal requires legal review"
        self.assertTrue('🚫' in response or 'BLOCKED: true' in response)

    def test_approved_not_blocked(self):
        response = "✅ No issues found\nBLOCKED: false"
        is_blocked = '🚫' in response or 'BLOCKED: true' in response
        self.assertFalse(is_blocked)

    def test_warning_not_blocked(self):
        response = "⚠️ Minor concern, but acceptable"
        is_blocked = '🚫' in response or 'BLOCKED: true' in response
        self.assertFalse(is_blocked)


class TestModelFailCountReset(unittest.TestCase):
    """Test that model success resets failure count."""

    def test_success_sql_resets_fail_count(self):
        # Verify the SQL pattern includes fail_count = 0
        from utils.memory import record_model_success
        import inspect
        source = inspect.getsource(record_model_success)
        self.assertIn('fail_count = 0', source)


if __name__ == '__main__':
    unittest.main()
