"""
Shared pytest fixtures for all backend tests.
"""
import pytest
from backend.app import app as flask_app, db as _db, User, Post


# ──────────────────────────────────────────────
# App / DB fixtures
# ──────────────────────────────────────────────
@pytest.fixture(scope="session")
def app():
    flask_app.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        WTF_CSRF_ENABLED=False,
    )
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture(scope="session")
def db(app):
    return _db


@pytest.fixture(autouse=True)
def clean_db(db):
    """Wipe all rows before every test so tests are fully isolated."""
    yield
    db.session.rollback()
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()


@pytest.fixture()
def client(app):
    return app.test_client()


# ──────────────────────────────────────────────
# Factory fixtures
# ──────────────────────────────────────────────
@pytest.fixture()
def make_user(db):
    """Factory: create and persist a User, returning the ORM object."""
    def _factory(username="alice", email="alice@example.com"):
        user = User(username=username, email=email)
        db.session.add(user)
        db.session.commit()
        return user
    return _factory


@pytest.fixture()
def make_post(db, make_user):
    """Factory: create and persist a Post, returning the ORM object."""
    def _factory(title="Hello", body="World", published=False, user=None):
        if user is None:
            user = make_user()
        post = Post(title=title, body=body, published=published, user_id=user.id)
        db.session.add(post)
        db.session.commit()
        return post
    return _factory


@pytest.fixture()
def alice(make_user):
    return make_user(username="alice", email="alice@example.com")


@pytest.fixture()
def alice_post(make_post, alice):
    return make_post(title="Alice's Post", body="Body text", user=alice)
