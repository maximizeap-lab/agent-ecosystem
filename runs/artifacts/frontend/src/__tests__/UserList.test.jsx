/**
 * Integration tests for the UserList component.
 * Mocks the global fetch to control API responses and verifies
 * full component behaviour including loading, error, pagination, and delete.
 */
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserList from "../components/UserList";

// ─── Helpers ──────────────────────────────────────────────────────────────
function buildUserPage(users, { total = users.length, pages = 1, currentPage = 1 } = {}) {
  return {
    users,
    total,
    pages,
    current_page: currentPage,
  };
}

const USERS = [
  { id: 1, username: "alice", email: "alice@example.com", created_at: "2024-01-01T00:00:00" },
  { id: 2, username: "bob",   email: "bob@example.com",   created_at: "2024-01-02T00:00:00" },
];

function mockFetch(responseBody, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(responseBody),
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ══════════════════════════════════════════════
// Loading state
// ══════════════════════════════════════════════
describe("loading state", () => {
  it("shows a loading indicator while fetching", () => {
    // Never resolve – keeps the component in loading state
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<UserList />);
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
  });

  it("hides the loading indicator after fetch completes", async () => {
    mockFetch(buildUserPage(USERS));
    render(<UserList />);
    await waitFor(() =>
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// Success state
// ══════════════════════════════════════════════
describe("success state", () => {
  it("renders a UserCard for each user", async () => {
    mockFetch(buildUserPage(USERS));
    render(<UserList />);
    await waitFor(() =>
      expect(screen.getAllByTestId("user-card")).toHaveLength(2)
    );
  });

  it("displays correct usernames", async () => {
    mockFetch(buildUserPage(USERS));
    render(<UserList />);
    await waitFor(() => screen.getAllByTestId("user-card"));
    const names = screen.getAllByTestId("user-username").map((el) => el.textContent);
    expect(names).toContain("alice");
    expect(names).toContain("bob");
  });

  it("calls fetch with page=1 on mount", async () => {
    mockFetch(buildUserPage(USERS));
    render(<UserList />);
    await waitFor(() => screen.getAllByTestId("user-card"));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=1")
    );
  });
});

// ══════════════════════════════════════════════
// Empty state
// ══════════════════════════════════════════════
describe("empty state", () => {
  it("shows the empty-state message when no users returned", async () => {
    mockFetch(buildUserPage([]));
    render(<UserList />);
    await waitFor(() =>
      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    );
  });

  it("does not render any UserCards when list is empty", async () => {
    mockFetch(buildUserPage([]));
    render(<UserList />);
    await waitFor(() => screen.getByTestId("user-list"));
    expect(screen.queryAllByTestId("user-card")).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════
// Error state
// ══════════════════════════════════════════════
describe("error state", () => {
  it("shows error message on network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network Error"));
    render(<UserList />);
    await waitFor(() =>
      expect(screen.getByTestId("error-message")).toBeInTheDocument()
    );
  });

  it("shows error message on non-OK response", async () => {
    mockFetch({ error: "Internal Server Error" }, 500);
    render(<UserList />);
    await waitFor(() =>
      expect(screen.getByTestId("error-message")).toBeInTheDocument()
    );
  });

  it("error message has role=alert for accessibility", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("fail"));
    render(<UserList />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// Pagination
// ══════════════════════════════════════════════
describe("pagination", () => {
  it("renders pagination controls", async () => {
    mockFetch(buildUserPage(USERS));
    render(<UserList />);
    await waitFor(() => screen.getByTestId("pagination"));
    expect(screen.getByTestId("prev-page")).toBeInTheDocument();
    expect(screen.getByTestId("next-page")).toBeInTheDocument();
  });

  it("disables Previous button on the first page", async () => {
    mockFetch(buildUserPage(USERS, { pages: 3 }));
    render(<UserList />);
    await waitFor(() => screen.getByTestId("pagination"));
    expect(screen.getByTestId("prev-page")).toBeDisabled();
  });

  it("disables Next button on the last page", async () => {
    mockFetch(buildUserPage(USERS, { pages: 1, currentPage: 1 }));
    render(<UserList />);
    await waitFor(() => screen.getByTestId("pagination"));
    expect(screen.getByTestId("next-page")).toBeDisabled();
  });

  it("shows correct page info", async () => {
    mockFetch(buildUserPage(USERS, { pages: 4, currentPage: 1 }));
    render(<UserList />);
    await waitFor(() => screen.getByTestId("page-info"));
    expect(screen.getByTestId("page-info")).toHaveTextContent("Page 1 of 4");
  });

  it("fetches page 2 when Next is clicked", async () => {
    const page1 = buildUserPage(USERS, { pages: 2, currentPage: 1 });
    const page2 = buildUserPage(
      [{ id: 3, username: "carol", email: "c@ex.com", created_at: "2024-01-03T00:00:00" }],
      { pages: 2, currentPage: 2 }
    );
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

    render(<UserList />);
    await waitFor(() => screen.getByTestId("next-page"));
    fireEvent.click(screen.getByTestId("next-page"));

    await waitFor(() =>
      expect(screen.getByTestId("page-info")).toHaveTextContent("Page 2 of 2")
    );
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });
});

// ══════════════════════════════════════════════
// Delete
// ══════════════════════════════════════════════
describe("delete user", () => {
  it("removes a user card after successful delete", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(buildUserPage(USERS)) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "deleted" }) });

    render(<UserList />);
    await waitFor(() => screen.getAllByTestId("user-card"));

    const cards = screen.getAllByTestId("user-card");
    const deleteBtn = within(cards[0]).getByTestId("delete-btn");
    fireEvent.click(deleteBtn);

    await waitFor(() =>
      expect(screen.getAllByTestId("user-card")).toHaveLength(1)
    );
  });

  it("shows error when delete request fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(buildUserPage(USERS)) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) });

    render(<UserList />);
    await waitFor(() => screen.getAllByTestId("user-card"));
    fireEvent.click(screen.getAllByTestId("delete-btn")[0]);

    await waitFor(() =>
      expect(screen.getByTestId("error-message")).toBeInTheDocument()
    );
  });

  it("calls DELETE on the correct endpoint", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(buildUserPage(USERS)) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ message: "deleted" }) });

    render(<UserList />);
    await waitFor(() => screen.getAllByTestId("user-card"));
    fireEvent.click(screen.getAllByTestId("delete-btn")[0]);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({ method: "DELETE" })
      )
    );
  });
});
