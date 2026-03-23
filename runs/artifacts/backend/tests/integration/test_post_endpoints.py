"""
Integration tests for Post API endpoints.
"""
import pytest
import json


# ══════════════════════════════════════════════
# GET /api/posts
# ══════════════════════════════════════════════
class TestGetPosts:
    def test_returns_all_posts(self, client, make_post, alice):
        make_post("P1", "B1", published=True,  user=alice)
        make_post("P2", "B2", published=False, user=alice)
        res = client.get("/api/posts")
        body = res.get_json()
        assert res.status_code == 200
        assert body["total"] == 2

    def test_empty_returns_empty_list(self, client):
        body = client.get("/api/posts").get_json()
        assert body["posts"] == []
        assert body["total"] == 0

    def test_published_filter_true(self, client, make_post, alice):
        make_post("Pub",   "B", published=True,  user=alice)
        make_post("Draft", "B", published=False, user=alice)
        res = client.get("/api/posts?published=true")
        body = res.get_json()
        assert body["total"] == 1
        assert body["posts"][0]["title"] == "Pub"

    def test_published_filter_false_returns_all(self, client, make_post, alice):
        make_post("Pub",   "B", published=True,  user=alice)
        make_post("Draft", "B", published=False, user=alice)
        res = client.get("/api/posts?published=false")
        assert res.get_json()["total"] == 2

    def test_post_shape(self, client, alice_post):
        post = client.get("/api/posts").get_json()["posts"][0]
        assert all(k in post for k in ("id", "title", "body", "published", "user_id", "created_at"))


# ══════════════════════════════════════════════
# GET /api/posts/<id>
# ══════════════════════════════════════════════
class TestGetPost:
    def test_get_existing_post(self, client, alice_post):
        res = client.get(f"/api/posts/{alice_post.id}")
        assert res.status_code == 200
        assert res.get_json()["title"] == "Alice's Post"

    def test_get_nonexistent_post_returns_404(self, client):
        assert client.get("/api/posts/9999").status_code == 404


# ══════════════════════════════════════════════
# GET /api/users/<id>/posts
# ══════════════════════════════════════════════
class TestGetUserPosts:
    def test_returns_only_user_posts(self, client, make_user, make_post):
        u1 = make_user("owner1", "o1@ex.com")
        u2 = make_user("owner2", "o2@ex.com")
        make_post("U1 Post", "B", user=u1)
        make_post("U1 Post2", "B", user=u1)
        make_post("U2 Post", "B", user=u2)

        body = client.get(f"/api/users/{u1.id}/posts").get_json()
        assert body["total"] == 2
        assert all(p["user_id"] == u1.id for p in body["posts"])

    def test_nonexistent_user_returns_404(self, client):
        assert client.get("/api/users/9999/posts").status_code == 404

    def test_user_with_no_posts_returns_empty_list(self, client, alice):
        body = client.get(f"/api/users/{alice.id}/posts").get_json()
        assert body["posts"] == []
        assert body["total"] == 0


# ══════════════════════════════════════════════
# POST /api/posts
# ══════════════════════════════════════════════
class TestCreatePost:
    def test_creates_post_successfully(self, client, alice):
        payload = {"title": "New Post", "body": "Content", "user_id": alice.id}
        res = client.post("/api/posts",
                          data=json.dumps(payload),
                          content_type="application/json")
        assert res.status_code == 201
        body = res.get_json()
        assert body["title"] == "New Post"
        assert body["user_id"] == alice.id

    def test_published_defaults_to_false(self, client, alice):
        payload = {"title": "Draft", "body": "B", "user_id": alice.id}
        res = client.post("/api/posts",
                          data=json.dumps(payload),
                          content_type="application/json")
        assert res.get_json()["published"] is False

    def test_can_create_published_post(self, client, alice):
        payload = {"title": "Live", "body": "B", "user_id": alice.id, "published": True}
        res = client.post("/api/posts",
                          data=json.dumps(payload),
                          content_type="application/json")
        assert res.get_json()["published"] is True

    def test_missing_title_returns_400(self, client, alice):
        res = client.post("/api/posts",
                          data=json.dumps({"body": "B", "user_id": alice.id}),
                          content_type="application/json")
        assert res.status_code == 400
        assert "title" in res.get_json()["error"].lower()

    def test_missing_body_returns_400(self, client, alice):
        res = client.post("/api/posts",
                          data=json.dumps({"title": "T", "user_id": alice.id}),
                          content_type="application/json")
        assert res.status_code == 400

    def test_missing_user_id_returns_400(self, client):
        res = client.post("/api/posts",
                          data=json.dumps({"title": "T", "body": "B"}),
                          content_type="application/json")
        assert res.status_code == 400

    def test_nonexistent_user_id_returns_404(self, client):
        res = client.post("/api/posts",
                          data=json.dumps({"title": "T", "body": "B", "user_id": 9999}),
                          content_type="application/json")
        assert res.status_code == 404

    def test_non_json_body_returns_400(self, client):
        res = client.post("/api/posts",
                          data="title=T",
                          content_type="text/plain")
        assert res.status_code == 400

    def test_post_is_persisted_in_db(self, client, alice, db):
        from backend.app import Post
        client.post("/api/posts",
                    data=json.dumps({"title": "DB Check", "body": "B", "user_id": alice.id}),
                    content_type="application/json")
        assert Post.query.filter_by(title="DB Check").first() is not None


# ══════════════════════════════════════════════
# PUT /api/posts/<id>
# ══════════════════════════════════════════════
class TestUpdatePost:
    def test_update_title(self, client, alice_post):
        res = client.put(f"/api/posts/{alice_post.id}",
                         data=json.dumps({"title": "Updated Title"}),
                         content_type="application/json")
        assert res.status_code == 200
        assert res.get_json()["title"] == "Updated Title"

    def test_update_body(self, client, alice_post):
        res = client.put(f"/api/posts/{alice_post.id}",
                         data=json.dumps({"body": "New body content"}),
                         content_type="application/json")
        assert res.status_code == 200
        assert res.get_json()["body"] == "New body content"

    def test_publish_post(self, client, alice_post):
        res = client.put(f"/api/posts/{alice_post.id}",
                         data=json.dumps({"published": True}),
                         content_type="application/json")
        assert res.status_code == 200
        assert res.get_json()["published"] is True

    def test_unpublish_post(self, client, make_post, alice):
        post = make_post(published=True, user=alice)
        res = client.put(f"/api/posts/{post.id}",
                         data=json.dumps({"published": False}),
                         content_type="application/json")
        assert res.get_json()["published"] is False

    def test_update_multiple_fields_at_once(self, client, alice_post):
        res = client.put(f"/api/posts/{alice_post.id}",
                         data=json.dumps({"title": "Multi", "body": "Updated", "published": True}),
                         content_type="application/json")
        body = res.get_json()
        assert body["title"] == "Multi"
        assert body["body"] == "Updated"
        assert body["published"] is True

    def test_update_nonexistent_post_returns_404(self, client):
        res = client.put("/api/posts/9999",
                         data=json.dumps({"title": "x"}),
                         content_type="application/json")
        assert res.status_code == 404

    def test_no_json_body_returns_400(self, client, alice_post):
        res = client.put(f"/api/posts/{alice_post.id}",
                         data="garbage",
                         content_type="text/plain")
        assert res.status_code == 400


# ══════════════════════════════════════════════
# DELETE /api/posts/<id>
# ══════════════════════════════════════════════
class TestDeletePost:
    def test_delete_existing_post(self, client, alice_post):
        res = client.delete(f"/api/posts/{alice_post.id}")
        assert res.status_code == 200
        assert "deleted" in res.get_json()["message"].lower()

    def test_post_no_longer_in_db(self, client, alice_post, db):
        from backend.app import Post
        pid = alice_post.id
        client.delete(f"/api/posts/{pid}")
        assert Post.query.get(pid) is None

    def test_delete_nonexistent_post_returns_404(self, client):
        assert client.delete("/api/posts/9999").status_code == 404


# ══════════════════════════════════════════════
# GET /api/health
# ══════════════════════════════════════════════
class TestHealthCheck:
    def test_health_returns_200(self, client):
        assert client.get("/api/health").status_code == 200

    def test_health_body(self, client):
        body = client.get("/api/health").get_json()
        assert body["status"] == "ok"
        assert "timestamp" in body
