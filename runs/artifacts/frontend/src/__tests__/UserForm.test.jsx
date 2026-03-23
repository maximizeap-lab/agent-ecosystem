/**
 * Tests for the UserForm component.
 * Covers client-side validation, submission, create vs. edit modes,
 * server error display, and accessibility attributes.
 */
import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserForm from "../components/UserForm";

// ─── Helpers ──────────────────────────────────────────────────────────────
function fillForm({ username = "", email = "" } = {}) {
  if (username) {
    userEvent.clear(screen.getByTestId("input-username"));
    userEvent.type(screen.getByTestId("input-username"), username);
  }
  if (email) {
    userEvent.clear(screen.getByTestId("input-email"));
    userEvent.type(screen.getByTestId("input-email"), email);
  }
}

function mockFetch(body, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => jest.restoreAllMocks());

// ══════════════════════════════════════════════
// Rendering
// ══════════════════════════════════════════════
describe("rendering", () => {
  it("renders username and email inputs", () => {
    render(<UserForm onSuccess={jest.fn()} />);
    expect(screen.getByTestId("input-username")).toBeInTheDocument();
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
  });

  it("renders 'Create User' submit button in create mode", () => {
    render(<UserForm onSuccess={jest.fn()} />);
    expect(screen.getByTestId("submit-btn")).toHaveTextContent("Create User");
  });

  it("renders 'Update User' submit button in edit mode", () => {
    render(<UserForm onSuccess={jest.fn()} initialValues={{ id: 1, username: "alice", email: "a@a.com" }} />);
    expect(screen.getByTestId("submit-btn")).toHaveTextContent("Update User");
  });

  it("pre-fills inputs in edit mode", () => {
    render(<UserForm onSuccess={jest.fn()} initialValues={{ id: 1, username: "alice", email: "alice@ex.com" }} />);
    expect(screen.getByTestId("input-username")).toHaveValue("alice");
    expect(screen.getByTestId("input-email")).toHaveValue("alice@ex.com");
  });

  it("starts with empty inputs in create mode", () => {
    render(<UserForm onSuccess={jest.fn()} />);
    expect(screen.getByTestId("input-username")).toHaveValue("");
    expect(screen.getByTestId("input-email")).toHaveValue("");
  });
});

// ══════════════════════════════════════════════
// Client-side validation
// ══════════════════════════════════════════════
describe("client-side validation", () => {
  it("shows username required error when username is empty", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-username")).toHaveTextContent(/required/i)
    );
  });

  it("shows email required error when email is empty", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "alice");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-email")).toHaveTextContent(/required/i)
    );
  });

  it("shows error when username is less than 3 characters", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "ab");
    userEvent.type(screen.getByTestId("input-email"), "a@a.com");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-username")).toHaveTextContent(/3 characters/i)
    );
  });

  it("shows error for invalid email format", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "validuser");
    userEvent.type(screen.getByTestId("input-email"), "not-an-email");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("error-email")).toHaveTextContent(/invalid/i)
    );
  });

  it("does not call fetch when validation fails", async () => {
    global.fetch = jest.fn();
    render(<UserForm onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => screen.getByTestId("error-username"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("clears username error when user starts typing", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => screen.getByTestId("error-username"));
    userEvent.type(screen.getByTestId("input-username"), "abc");
    await waitFor(() =>
      expect(screen.queryByTestId("error-username")).not.toBeInTheDocument()
    );
  });

  it("validation errors have role=alert for accessibility", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it("marks invalid input with aria-invalid", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByTestId("input-username")).toHaveAttribute("aria-invalid", "true")
    );
  });
});

// ══════════════════════════════════════════════
// Successful submission – create mode
// ══════════════════════════════════════════════
describe("successful create submission", () => {
  const newUser = { id: 10, username: "carol", email: "carol@ex.com" };

  beforeEach(() => mockFetch(newUser, 201));

  it("calls POST /api/users with correct payload", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ username: "carol", email: "carol@ex.com" }),
        })
      )
    );
  });

  it("calls onSuccess callback with the new user object", async () => {
    const onSuccess = jest.fn();
    render(<UserForm onSuccess={onSuccess} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(newUser));
  });

  it("resets the form to empty after successful creation", async () => {
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("input-username")).toHaveValue("");
      expect(screen.getByTestId("input-email")).toHaveValue("");
    });
  });
});

// ══════════════════════════════════════════════
// Successful submission – edit mode
// ══════════════════════════════════════════════
describe("successful edit submission", () => {
  const existingUser = { id: 1, username: "alice", email: "alice@ex.com" };
  const updatedUser  = { ...existingUser, email: "newalice@ex.com" };

  it("calls PUT /api/users/:id", async () => {
    mockFetch(updatedUser, 200);
    render(<UserForm onSuccess={jest.fn()} initialValues={existingUser} />);
    userEvent.clear(screen.getByTestId("input-email"));
    userEvent.type(screen.getByTestId("input-email"), "newalice@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({ method: "PUT" })
      )
    );
  });

  it("does not reset form after successful edit", async () => {
    mockFetch(updatedUser, 200);
    const onSuccess = jest.fn();
    render(<UserForm onSuccess={onSuccess} initialValues={existingUser} />);
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    // Inputs should still have values from initialValues
    expect(screen.getByTestId("input-username")).toHaveValue("alice");
  });
});

// ══════════════════════════════════════════════
// Server-side errors
// ══════════════════════════════════════════════
describe("server errors", () => {
  it("displays server error message on 409 conflict", async () => {
    mockFetch({ error: "Username already taken" }, 409);
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "alice");
    userEvent.type(screen.getByTestId("input-email"), "alice@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("server-error")).toHaveTextContent("Username already taken")
    );
  });

  it("displays fallback message when server returns no error text", async () => {
    mockFetch({}, 500);
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("server-error")).toHaveTextContent(/unexpected error/i)
    );
  });

  it("displays network error message on fetch rejection", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network Error"));
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("server-error")).toHaveTextContent(/network error/i)
    );
  });

  it("server error has role=alert", async () => {
    mockFetch({ error: "Conflict" }, 409);
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "x");
    userEvent.type(screen.getByTestId("input-email"), "x@x.com");
    // username too short will fail client validation; use valid data
    userEvent.clear(screen.getByTestId("input-username"));
    userEvent.type(screen.getByTestId("input-username"), "xxx");
    fireEvent.click(screen.getByTestId("submit-btn"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });
});

// ══════════════════════════════════════════════
// Submitting state
// ══════════════════════════════════════════════
describe("submitting state", () => {
  it("disables the submit button while submitting", async () => {
    // Deliberately stall the fetch
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("submit-btn")).toBeDisabled()
    );
  });

  it("shows 'Saving…' text while submitting", async () => {
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<UserForm onSuccess={jest.fn()} />);
    userEvent.type(screen.getByTestId("input-username"), "carol");
    userEvent.type(screen.getByTestId("input-email"), "carol@ex.com");
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() =>
      expect(screen.getByTestId("submit-btn")).toHaveTextContent(/saving/i)
    );
  });
});
