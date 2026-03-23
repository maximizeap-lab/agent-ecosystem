"""
Integration tests for User API endpoints.
Each test sends a real HTTP request through the Flask test client and
asserts on status codes, response shapes, and side-effects in the DB.
"""
import pytest
import json


# ══════════════════════════════════════════════
# GET /api/users
# ══════════════════════════════════════════════
class TestGetUsers:
    def test_empty_list(self, client):
        res = client.get("/api/users")
        assert res.status_code == 200
        body = res.get_json()
        assert body["users"] == []
        assert body["total"] == 0

    def test_returns_created_users(self, client, make_user):
        make_user("u1", "u1@ex.com")
        make_user("u2", "u2@ex.com")
        res = client.get("/api/users")
        assert res.status_code == 200
        body = res.get_json()
        assert body["total"] == 2
        usernames = {u["username"] for u in body["users"]}
        assert usernames == {"u1", "u2"}

    def test_pagination_page_1(self, client, make_user):
        for i in range(7):
            make_user(f"pag_{i}", f"pag_{i}@ex.com")
        res = client.get("/api/users?page=1&per_page=5")
        body = res.get_json()
        assert len(body["users"]) == 5
        assert body["total"] == 7
        assert body["pages"] == 2
        assert body["current_page"] == 1

    def test_pagination_page_2(self, client, make_user):
        for i in range(7):
            make_user(f"pg2_{i}", f"pg2_{i}@ex.com")
        res = client.get("/api/users?page=2&per_page=5")
        body = res.get_json()
        assert len(body["users"]) == 2
        assert body["current_page"] == 2

    def test_per_page_capped_at_100(self, client, make_user):
        for i in range(5):
            make_user(f"cap_{i}", f"cap_{i}@ex.com")
        # requesting 999 should not error, just return all 5
        res = client.get("/api/users?per_page=999")
        assert res.status_code == 200

    def test_response_user_shape(self, client, alice):
        res = client.get("/api/users")
        user = res.get_json()["users"][0]
        assert all(k in user for k in ("id", "username", "email", "created_at"))


# ══════════════════════════════════════════════
# GET /api/users/<id>
# ══════════════════════════════════════════════
class TestGetUser:
    def test_get_existing_user(self, client, alice):
        res = client.get(f"/api/users/{alice.id}")
        assert res.status_code == 200
        body = res.get_json()
        assert body["username"] == "alice"
        assert body["email"] == "alice@example.com"

    def test_get_nonexistent_user_returns_404(self, client):
        res = client.get("/api/users/9999")
        assert res.status_code == 404

    def test_get_user_contains_all_fields(self, client, alice):
        body = client.get(f"/api/users/{alice.id}").get_json()
        assert set(body.keys()) >= {"id", "username", "email", "created_at"}


# ══════════════════════════════════════════════
# POST /api/users
# ══════════════════════════════════════════════
class TestCreateUser:
    def test_creates_user_successfully(self, client):
        res = client.post("/api/users",
                          data=json.dumps({"username": "newuser", "email": "new@ex.com"}),
                          content_type="application/json")
        assert res.status_code == 201
        body = res.get_json()
        assert body["username"] == "newuser"
        assert body["email"] == "new@ex.com"
        assert "id" in body

    def test_created_user_is_persisted(self, client, db):
        client.post("/api/users",
                    data=json.dumps({"username": "persist_me", "email": "p@ex.com"}),
                    content_type="application/json")
        from backend.app import User
        assert User.query.filter_by(username="persist_me").first() is not None

    def test_missing_username_returns_400(self, client):
        res = client.post("/api/users",
                          data=json.dumps({"email": "x@ex.com"}),
                          content_type="application/json")
        assert res.status_code == 400
        assert "username" in res.get_json()["error"].lower()

    def test_missing_email_returns_400(self, client):
        res = client.post("/api/users",
                          data=json.dumps({"username": "nomail"}),
                          content_type="application/json")
        assert res.status_code == 400
        assert "email" in res.get_json()["error"].lower()

    def test_missing_both_fields_returns_400(self, client):
        res = client.post("/api/users",
                          data=json.dumps({}),
                          content_type="application/json")
        assert res.status_code == 400

    def test_invalid_email_format_returns_400(self, client):
        res = client.post("/api/users",
                          data=json.dumps({"username": "badmail", "email": "not-an-email"}),
                          content_type="application/json")
        assert res.status_code == 400
        assert "email" in res.get_json()["error"].lower()

    def test_duplicate_username_returns_409(self, client, alice):
        res = client.post("/api/users",
                          data=json.dumps({"username": "alice", "email": "other@ex.com"}),
                          content_type="application/json")
        assert res.status_code == 409
        assert "username" in res.get_json()["error"].lower()

    def test_duplicate_email_returns_409(self, client, alice):
        res = client.post("/api/users",
                          data=json.dumps({"username": "other", "email": "alice@example.com"}),
                          content_type="application/json")
        assert res.status_code == 409
        assert "email" in res.get_json()["error"].lower()

    def test_non_json_body_returns_400(self, client):
        res = client.post("/api/users",
                          data="username=x&email=x@x.com",
                          content_type="text/plain")
        assert res.status_code == 400

    def test_empty_body_returns_400(self, client):
        res = client.post("/api/users", content_type="application/json")
        assert res.status_code == 400


# ══════════════════════════════════════════════
# PUT /api/users/<id>
# ══════════════════════════════════════════════
class TestUpdateUser:
    def test_update_email(self, client, alice):
        res = client.put(f"/api/users/{alice.id}",
                         data=json.dumps({"email": "new_alice@ex.com"}),
                         content_type="application/json")
        assert res.status_code == 200
        assert res.get_json()["email"] == "new_alice@ex.com"

    def test_update_username(self, client, alice):
        res = client.put(f"/api/users/{alice.id}",
                         data=json.dumps({"username": "alice_v2"}),
                         content_type="application/json")
        assert res.status_code == 200
        assert res.get_json()["username"] == "alice_v2"

    def test_update_with_same_email_is_allowed(self, client, alice):
        """A user should be able to PUT their own email without 409."""
        res = client.put(f"/api/users/{alice.id}",
                         data=json.dumps({"email": "alice@example.com"}),
                         content_type="application/json")
        assert res.status_code == 200

    def test_update_with_invalid_email_returns_400(self, client, alice):
        res = client.put(f"/api/users/{alice.id}",
                         data=json.dumps({"email": "bad-email"}),
                         content_type="application/json")
        assert res.status_code == 400

    def test_update_nonexistent_user_returns_404(self, client):
        res = client.put("/api/users/9999",
                         data=json.dumps({"email": "x@x.com"}),
                         content_type="application/json")
        assert res.status_code == 404

    def test_email_conflict_with_other_user_returns_409(self, client, alice, make_user):
        bob = make_user("bob", "bob@ex.com")
        res = client.put(f"/api/users/{bob.id}",
                         data=json.dumps({"email": "alice@example.com"}),
                         content_type="application/json")
        assert res.status_code == 409

    def test_username_conflict_with_other_user_returns_409(self, client, alice, make_user):
        bob = make_user("bob", "bob@ex.com")
        res = client.put(f"/api/users/{bob.id}",
                         data=json.dumps({"username": "alice"}),
                         content_type="application/json")
        assert res.status_code == 409

    def test_no_json_body_returns_400(self, client, alice):
        res = client.put(f"/api/users/{alice.id}",
                         data="garbage",
                         content_type="text/plain")
        assert res.status_code == 400


# ══════════════════════════════════════════════
# DELETE /api/users/<id>
# ══════════════════════════════════════════════
class TestDeleteUser:
    def test_delete_existing_user(self, client, alice):
        res = client.delete(f"/api/users/{alice.id}")
        assert res.status_code == 200
        assert "deleted" in res.get_json()["message"].lower()

    def test_user_no_longer_in_db(self, client, alice, db):
        from backend.app import User
        uid = alice.id
        client.delete(f"/api/users/{uid}")
        assert User.query.get(uid) is None

    def test_delete_nonexistent_user_returns_404(self, client):
        res = client.delete("/api/users/9999")
        assert res.status_code == 404

    def test_delete_removes_associated_posts(self, client, alice, alice_post, db):
        from backend.app import Post
        post_id = alice_post.id
        client.delete(f"/api/users/{alice.id}")
        assert Post.query.get(post_id) is None
