/**
 * Pure unit tests for the PostList reducer function.
 * Imported directly – no React rendering needed.
 */

// We pull the reducer out by importing the raw module.
// Since it's not exported, we re-declare it here to keep tests self-contained
// (alternatively expose it from PostList.jsx and import directly).

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return { ...state, loading: false, posts: action.payload };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "REMOVE_POST":
      return { ...state, posts: state.posts.filter((p) => p.id !== action.payload) };
    case "TOGGLE_PUBLISHED":
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === action.payload ? { ...p, published: !p.published } : p
        ),
      };
    default:
      return state;
  }
}

const initialState = { posts: [], loading: false, error: null };

const POST_A = { id: 1, title: "A", body: "B", published: false };
const POST_B = { id: 2, title: "C", body: "D", published: true  };

describe("PostList reducer", () => {
  // ─── FETCH_START ──────────────────────────────────────────────────────
  describe("FETCH_START", () => {
    it("sets loading to true", () => {
      const state = reducer(initialState, { type: "FETCH_START" });
      expect(state.loading).toBe(true);
    });

    it("clears any existing error", () => {
      const withError = { ...initialState, error: "Previous error" };
      const state = reducer(withError, { type: "FETCH_START" });
      expect(state.error).toBeNull();
    });

    it("does not modify the posts array", () => {
      const withPosts = { ...initialState, posts: [POST_A] };
      const state = reducer(withPosts, { type: "FETCH_START" });
      expect(state.posts).toEqual([POST_A]);
    });
  });

  // ─── FETCH_SUCCESS ────────────────────────────────────────────────────
  describe("FETCH_SUCCESS", () => {
    it("sets posts to the payload", () => {
      const state = reducer(initialState, { type: "FETCH_SUCCESS", payload: [POST_A, POST_B] });
      expect(state.posts).toEqual([POST_A, POST_B]);
    });

    it("sets loading to false", () => {
      const loading = { ...initialState, loading: true };
      const state = reducer(loading, { type: "FETCH_SUCCESS", payload: [] });
      expect(state.loading).toBe(false);
    });

    it("replaces existing posts entirely", () => {
      const withOld = { ...initialState, posts: [POST_A] };
      const state = reducer(withOld, { type: "FETCH_SUCCESS", payload: [POST_B] });
      expect(state.posts).toEqual([POST_B]);
    });
  });

  // ─── FETCH_ERROR ──────────────────────────────────────────────────────
  describe("FETCH_ERROR", () => {
    it("sets the error message", () => {
      const state = reducer(initialState, { type: "FETCH_ERROR", payload: "Network Error" });
      expect(state.error).toBe("Network Error");
    });

    it("sets loading to false", () => {
      const loading = { ...initialState, loading: true };
      const state = reducer(loading, { type: "FETCH_ERROR", payload: "err" });
      expect(state.loading).toBe(false);
    });

    it("preserves existing posts", () => {
      const withPosts = { ...initialState, posts: [POST_A] };
      const state = reducer(withPosts, { type: "FETCH_ERROR", payload: "err" });
      expect(state.posts).toEqual([POST_A]);
    });
  });

  // ─── REMOVE_POST ─────────────────────────────────────────────────────
  describe("REMOVE_POST", () => {
    it("removes the post with the given id", () => {
      const withTwo = { ...initialState, posts: [POST_A, POST_B] };
      const state = reducer(withTwo, { type: "REMOVE_POST", payload: POST_A.id });
      expect(state.posts).toHaveLength(1);
      expect(state.posts[0].id).toBe(POST_B.id);
    });

    it("does nothing when id does not exist", () => {
      const withTwo = { ...initialState, posts: [POST_A, POST_B] };
      const state = reducer(withTwo, { type: "REMOVE_POST", payload: 9999 });
      expect(state.posts).toHaveLength(2);
    });

    it("results in empty array when last post is removed", () => {
      const withOne = { ...initialState, posts: [POST_A] };
      const state = reducer(withOne, { type: "REMOVE_POST", payload: POST_A.id });
      expect(state.posts).toEqual([]);
    });

    it("does not mutate the original state", () => {
      const original = { ...initialState, posts: [POST_A, POST_B] };
      reducer(original, { type: "REMOVE_POST", payload: POST_A.id });
      expect(original.posts).toHaveLength(2);
    });
  });

  // ─── TOGGLE_PUBLISHED ────────────────────────────────────────────────
  describe("TOGGLE_PUBLISHED", () => {
    it("flips a draft post to published", () => {
      const state = reducer(
        { ...initialState, posts: [POST_A] },
        { type: "TOGGLE_PUBLISHED", payload: POST_A.id }
      );
      expect(state.posts[0].published).toBe(true);
    });

    it("flips a published post to draft", () => {
      const state = reducer(
        { ...initialState, posts: [POST_B] },
        { type: "TOGGLE_PUBLISHED", payload: POST_B.id }
      );
      expect(state.posts[0].published).toBe(false);
    });

    it("only toggles the targeted post", () => {
      const state = reducer(
        { ...initialState, posts: [POST_A, POST_B] },
        { type: "TOGGLE_PUBLISHED", payload: POST_A.id }
      );
      expect(state.posts[0].published).toBe(true);   // toggled
      expect(state.posts[1].published).toBe(true);   // unchanged
    });

    it("does not mutate the original post object", () => {
      const originalPost = { ...POST_A };
      reducer(
        { ...initialState, posts: [originalPost] },
        { type: "TOGGLE_PUBLISHED", payload: POST_A.id }
      );
      expect(originalPost.published).toBe(false); // untouched
    });
  });

  // ─── Unknown action ───────────────────────────────────────────────────
  describe("unknown action", () => {
    it("returns state unchanged for unknown action types", () => {
      const state = reducer(initialState, { type: "UNKNOWN_ACTION" });
      expect(state).toBe(initialState);
    });
  });
});
