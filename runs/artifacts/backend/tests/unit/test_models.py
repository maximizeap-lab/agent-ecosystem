"""
Unit tests for SQLAlchemy model constraints and relationships.
Uses a real in-memory DB (from conftest) but stays below the HTTP layer.
"""
import pytest
from sqlalchemy.exc import IntegrityError
from backend.app import db, User, Post


class TestUserModel:
    def test_create_user_persists(self, db):
        user = User(username="dave", email="dave@example.com")
        db.session.add(user)
        db.session.commit()
        fetched = User.query.filter_by(username="dave").first()
        assert fetched is not None
        assert fetched.email == "dave@example.com"

    def test_username_unique_constraint(self, db):
        db.session.add(User(username="dup", email="dup1@example.com"))
        db.session.commit()
        db.session.add(User(username="dup", email="dup2@example.com"))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_email_unique_constraint(self, db):
        db.session.add(User(username="u1", email="same@example.com"))
        db.session.commit()
        db.session.add(User(username="u2", email="same@example.com"))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_username_cannot_be_null(self, db):
        db.session.add(User(email="noname@example.com"))
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

    def test_created_at_defaults_to_now(self, db):
        user = User(username="time_user", email="time@example.com")
        db.session.add(user)
        db.session.commit()
        assert user.created_at is not None

    def test_user_posts_relationship(self, db):
        user = User(username="rel_user", email="rel@example.com")
        db.session.add(user)
        db.session.commit()
        post = Post(title="P", body="B", user_id=user.id)
        db.session.add(post)
        db.session.commit()
        assert len(user.posts) == 1
        assert user.posts[0].title == "P"

    def test_cascade_delete_removes_posts(self, db):
        user = User(username="cascade_u", email="cascade@example.com")
        db.session.add(user)
        db.session.commit()
        post = Post(title="Owned", body="Body", user_id=user.id)
        db.session.add(post)
        db.session.commit()
        post_id = post.id

        db.session.delete(user)
        db.session.commit()
        assert Post.query.get(post_id) is None


class TestPostModel:
    def test_create_post_requires_user(self, db, alice):
        post = Post(title="Test", body="Body", user_id=alice.id)
        db.session.add(post)
        db.session.commit()
        assert post.id is not None

    def test_published_defaults_false(self, db, alice):
        post = Post(title="Draft", body="Body", user_id=alice.id)
        db.session.add(post)
        db.session.commit()
        assert post.published is False

    def test_backref_author(self, db, alice):
        post = Post(title="Backref", body="Body", user_id=alice.id)
        db.session.add(post)
        db.session.commit()
        assert post.author.username == "alice"
