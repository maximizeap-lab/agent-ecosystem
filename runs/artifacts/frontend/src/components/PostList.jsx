// PostList.jsx – shows posts, optionally filtered by published status
import React, { useEffect, useReducer, useCallback } from "react";
import PropTypes from "prop-types";

const initialState = { posts: [], loading: false, error: null };

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":  return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS": return { ...state, loading: false, posts: action.payload };
    case "FETCH_ERROR":  return { ...state, loading: false, error: action.payload };
    case "REMOVE_POST":  return { ...state, posts: state.posts.filter((p) => p.id !== action.payload) };
    case "TOGGLE_PUBLISHED":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload ? { ...p, published: !p.published } : p
        ),
      };
    default: return state;
  }
}

export function PostCard({ post, onDelete, onTogglePublish }) {
  return (
    <article data-testid="post-card" className="post-card">
      <h4 data-testid="post-title">{post.title}</h4>
      <p data-testid="post-body">{post.body}</p>
      <span data-testid="post-status">{post.published ? "Published" : "Draft"}</span>
      <button data-testid="toggle-publish-btn" onClick={() => onTogglePublish(post)}>
        {post.published ? "Unpublish" : "Publish"}
      </button>
      <button data-testid="delete-post-btn" onClick={() => onDelete(post.id)}>
        Delete
      </button>
    </article>
  );
}

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    body: PropTypes.string.isRequired,
    published: PropTypes.bool.isRequired,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onTogglePublish: PropTypes.func.isRequired,
};

export default function PostList({ publishedOnly = false }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchPosts = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const url = publishedOnly ? "/api/posts?published=true" : "/api/posts";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      dispatch({ type: "FETCH_SUCCESS", payload: data.posts });
    } catch (err) {
      dispatch({ type: "FETCH_ERROR", payload: err.message });
    }
  }, [publishedOnly]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleDelete = async (postId) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      dispatch({ type: "REMOVE_POST", payload: postId });
    } catch (err) {
      dispatch({ type: "FETCH_ERROR", payload: err.message });
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      });
      if (!res.ok) throw new Error("Update failed");
      dispatch({ type: "TOGGLE_PUBLISHED", payload: post.id });
    } catch (err) {
      dispatch({ type: "FETCH_ERROR", payload: err.message });
    }
  };

  if (state.loading) return <p data-testid="loading-posts">Loading posts…</p>;
  if (state.error)   return <p data-testid="posts-error" role="alert">{state.error}</p>;

  return (
    <div data-testid="post-list">
      {state.posts.length === 0 ? (
        <p data-testid="no-posts">No posts yet.</p>
      ) : (
        state.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={handleDelete}
            onTogglePublish={handleTogglePublish}
          />
        ))
      )}
    </div>
  );
}

PostList.propTypes = { publishedOnly: PropTypes.bool };
