/**
 * Tests for PostList and PostCard components.
 * Covers fetch, filter, delete, publish toggle, reducer logic, and error paths.
 */
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import PostList, { PostCard } from "../components/PostList";

// ─── Fixtures ─────────────────────────────────────────────────────────────
const PUBLISHED_POST = {
  id: 1, title: "Published Post", body: "This is published.",
  published: true, user_id: 1, created_at: "2024-01-01T00:00:00",
};
const DRAFT_POST = {
  id: 2, title: "Draft Post", body: "This is a draft.",
  published: false, user_id: 1, created_at: "2024-01-02T00:00:00",
};

function mockFetch(posts, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ posts, total: posts.length }),
  });
}

afterEach(() => jest.restoreAllMocks());

// ══════════════════════════════════════════════
// PostCard – unit tests
// ══════════════════════════════════════════════
describe("PostCard", () => {
  const handlers = { onDelete: jest.fn(), onTogglePublish: jest.fn() };

  it("renders title and body", () => {
    render(<PostCard post={PUBLISHED_POST} {...handlers} />);
    expect(screen.getByTestId("post-title")).toHaveTextContent("Published Post");
    expect(screen.getByTestId("post-body")).toHaveTextContent("This is published.");
  });

  it("shows 'Published' status for published posts", () => {
    render(<PostCard post={PUBLISHED_POST} {...handlers} />);
    expect(screen.getByTestId("post-status")).toHaveTextContent("Published");
  });

  it("shows 'Draft' status for unpublished posts", () => {
    render(<PostCard post={DRAFT_POST} {...handlers} />);
    expect(screen.getByTestId("post-status")).toHaveTextContent("Draft");
  });

  it("shows 'Unpublish' toggle button for published posts", () => {
    render(<PostCard post={PUBLISHED_POST} {...handlers} />);
    expect(screen.getByTestId("toggle-publish-btn")).toHaveTextContent("Unpublish");
  });

  it("shows 'Publish' toggle button for draft posts", () => {
    render(<PostCard post={DRAFT_POST} {...handlers} />);
    expect(screen.getByTestId("toggle-publish-btn")).toHaveTextContent("Publish");
  });

  it("calls onDelete with post id when Delete is clicked", () => {
    const onDelete = jest.fn();
    render(<PostCard post={PUBLISHED_POST} onDelete={onDelete} onTogglePublish={jest.fn()} />);
    fireEvent.click(screen.getByTestId("delete-post-btn"));
    expect(onDelete).toHaveBeenCalledWith(PUBLISHED_POST.id);
  });

  it("calls onTogglePublish with the full post when toggle is clicked", () => {
    const onTogglePublish = jest.fn();
    render(<PostCard post={DRAFT_POST} onDelete={jest.fn()} onTogglePublish={onTogglePublish} />);
    fireEvent.click(screen.getByTestId("toggle-publish-btn"));
    expect(onTogglePublish).toHaveBeenCalledWith(DRAFT_POST);
  });
});

// ══════════════════════════════════════════════
// PostList – loading state
// ══════════════════════════════════════════════
describe("PostList loading state", () => {
  it("shows loading indicator while fetching", () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<PostList />);
    expect(screen.getByTestId("loading-posts")).toBeInTheDocument();
  });

  it("hides loading indicator after fetch resolves", async () => {
    mockFetch([PUBLISHED_POST]);
    render(<PostList />);
    await waitFor(() =>
      expect(screen.queryByTestId("loading-posts")).not.toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// PostList – success state
// ══════════════════════════════════════════════
describe("PostList success state", () => {
  it("renders a PostCard for each post", async () => {
    mockFetch([PUBLISHED_POST, DRAFT_POST]);
    render(<PostList />);
    await waitFor(() =>
      expect(screen.getAllByTestId("post-card")).toHaveLength(2)
    );
  });

  it("calls fetch without filter when publishedOnly is false", async () => {
    mockFetch([]);
    render(<PostList publishedOnly={false} />);
    await waitFor(() => screen.getByTestId("post-list"));
    expect(global.fetch).toHaveBeenCalledWith("/api/posts");
  });

  it("calls fetch with ?published=true when publishedOnly is true", async () => {
    mockFetch([PUBLISHED_POST]);
    render(<PostList publishedOnly={true} />);
    await waitFor(() => screen.getByTestId("post-list"));
    expect(global.fetch).toHaveBeenCalledWith("/api/posts?published=true");
  });
});

// ══════════════════════════════════════════════
// PostList – empty state
// ══════════════════════════════════════════════
describe("PostList empty state", () => {
  it("shows 'No posts yet.' when list is empty", async () => {
    mockFetch([]);
    render(<PostList />);
    await waitFor(() =>
      expect(screen.getByTestId("no-posts")).toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// PostList – error state
// ══════════════════════════════════════════════
describe("PostList error state", () => {
  it("shows error when fetch rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network Error"));
    render(<PostList />);
    await waitFor(() =>
      expect(screen.getByTestId("posts-error")).toBeInTheDocument()
    );
  });

  it("shows error when server returns non-OK status", async () => {
    mockFetch([], 500);
    render(<PostList />);
    await waitFor(() =>
      expect(screen.getByTestId("posts-error")).toBeInTheDocument()
    );
  });

  it("error element has role=alert", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("fail"));
    render(<PostList />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// PostList – delete
// ══════════════════════════════════════════════
describe("PostList delete", () => {
  it("removes a post card after successful delete", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [PUBLISHED_POST, DRAFT_POST], total: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "deleted" }) });

    render(<PostList />);
    await waitFor(() => screen.getAllByTestId("post-card"));

    const cards = screen.getAllByTestId("post-card");
    fireEvent.click(within(cards[0]).getByTestId("delete-post-btn"));

    await waitFor(() =>
      expect(screen.getAllByTestId("post-card")).toHaveLength(1)
    );
  });

  it("calls DELETE /api/posts/:id", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [PUBLISHED_POST], total: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "deleted" }) });

    render(<PostList />);
    await waitFor(() => screen.getAllByTestId("post-card"));
    fireEvent.click(screen.getByTestId("delete-post-btn"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${PUBLISHED_POST.id}`,
        expect.objectContaining({ method: "DELETE" })
      )
    );
  });

  it("shows error when delete fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [PUBLISHED_POST], total: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });

    render(<PostList />);
    await waitFor(() => screen.getAllByTestId("post-card"));
    fireEvent.click(screen.getByTestId("delete-post-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("posts-error")).toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// PostList – toggle publish
// ══════════════════════════════════════════════
describe("PostList toggle publish", () => {
  it("toggles a draft post to published in the UI", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [DRAFT_POST], total: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...DRAFT_POST, published: true }) });

    render(<PostList />);
    await waitFor(() => screen.getByTestId("post-status"));
    expect(screen.getByTestId("post-status")).toHaveTextContent("Draft");

    fireEvent.click(screen.getByTestId("toggle-publish-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("post-status")).toHaveTextContent("Published")
    );
  });

  it("sends PUT /api/posts/:id with correct published value", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [DRAFT_POST], total: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ...DRAFT_POST, published: true }) });

    render(<PostList />);
    await waitFor(() => screen.getByTestId("toggle-publish-btn"));
    fireEvent.click(screen.getByTestId("toggle-publish-btn"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/posts/${DRAFT_POST.id}`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ published: true }),
        })
      )
    );
  });

  it("shows error when toggle PUT fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ posts: [DRAFT_POST], total: 1 }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });

    render(<PostList />);
    await waitFor(() => screen.getByTestId("toggle-publish-btn"));
    fireEvent.click(screen.getByTestId("toggle-publish-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("posts-error")).toBeInTheDocument()
    );
  });
});
