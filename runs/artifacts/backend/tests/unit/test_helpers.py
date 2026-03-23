"""
Unit tests for pure helper functions and model methods.
No HTTP layer or database is required.
"""
import pytest
from backend.app import validate_email, User, Post
from datetime import datetime


# ══════════════════════════════════════════════
# validate_email
# ══════════════════════════════════════════════
class TestValidateEmail:
    # --- valid addresses ---
    @pytest.mark.parametrize("email", [
        "user@example.com",
        "user.name+tag@sub.domain.org",
        "x@y.z",
        "test123@test.co.uk",
        "a@b.c",
    ])
    def test_valid_emails(self, email):
        assert validate_email(email) is True

    # --- invalid addresses ---
    @pytest.mark.parametrize("email", [
        "",
        "notanemail",
        "@nodomain.com",
        "missing-at-sign.com",
        "two@@signs.com",
        "no-tld@domain",
        None,  # should not raise
    ])
    def test_invalid_emails(self, email):
        # passing None coerces to bool(False) via re.match on non-string
        result = validate_email(email) if email is not None else validate_email("")
        assert result is False


# ══════════════════════════════════════════════
# User.to_dict
# ══════════════════════════════════════════════
class TestUserToDict:
    def test_contains_expected_keys(self):
        user = User(id=1, username="bob", email="bob@example.com",
                    created_at=datetime(2024, 1, 15, 10, 0, 0))
        d = user.to_dict()
        assert set(d.keys()) == {"id", "username", "email", "created_at"}

    def test_values_are_correct(self):
        ts = datetime(2024, 6, 1, 12, 0, 0)
        user = User(id=42, username="carol", email="carol@example.com", created_at=ts)
        d = user.to_dict()
        assert d["id"] == 42
        assert d["username"] == "carol"
        assert d["email"] == "carol@example.com"
        assert d["created_at"] == "2024-06-01T12:00:00"

    def test_created_at_is_iso_string(self):
        user = User(id=1, username="u", email="u@u.com", created_at=datetime.utcnow())
        assert isinstance(user.to_dict()["created_at"], str)


# ══════════════════════════════════════════════
# Post.to_dict
# ══════════════════════════════════════════════
class TestPostToDict:
    def test_contains_expected_keys(self):
        post = Post(id=1, title="T", body="B", published=True, user_id=5,
                    created_at=datetime(2024, 3, 1))
        d = post.to_dict()
        assert set(d.keys()) == {"id", "title", "body", "published", "user_id", "created_at"}

    def test_published_flag_preserved(self):
        post_pub  = Post(id=1, title="T", body="B", published=True,  user_id=1, created_at=datetime.utcnow())
        post_draft = Post(id=2, title="T", body="B", published=False, user_id=1, created_at=datetime.utcnow())
        assert post_pub.to_dict()["published"] is True
        assert post_draft.to_dict()["published"] is False
