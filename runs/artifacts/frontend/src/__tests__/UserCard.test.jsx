/**
 * Unit tests for the UserCard component.
 * Tests rendering, prop display, and interaction callbacks.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserCard } from "../components/UserList";

const mockUser = { id: 1, username: "alice", email: "alice@example.com" };

describe("UserCard", () => {
  // ─── Rendering ───────────────────────────────────────────────────────
  describe("rendering", () => {
    it("renders the username", () => {
      render(<UserCard user={mockUser} onDelete={jest.fn()} />);
      expect(screen.getByTestId("user-username")).toHaveTextContent("alice");
    });

    it("renders the email", () => {
      render(<UserCard user={mockUser} onDelete={jest.fn()} />);
      expect(screen.getByTestId("user-email")).toHaveTextContent("alice@example.com");
    });

    it("renders a Delete button", () => {
      render(<UserCard user={mockUser} onDelete={jest.fn()} />);
      expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
    });

    it("gives the Delete button an accessible aria-label", () => {
      render(<UserCard user={mockUser} onDelete={jest.fn()} />);
      expect(screen.getByRole("button", { name: /delete alice/i })).toBeInTheDocument();
    });

    it("renders the card wrapper element", () => {
      render(<UserCard user={mockUser} onDelete={jest.fn()} />);
      expect(screen.getByTestId("user-card")).toBeInTheDocument();
    });
  });

  // ─── Interactions ─────────────────────────────────────────────────────
  describe("interactions", () => {
    it("calls onDelete with the user id when Delete is clicked", () => {
      const onDelete = jest.fn();
      render(<UserCard user={mockUser} onDelete={onDelete} />);
      fireEvent.click(screen.getByTestId("delete-btn"));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it("does not call onDelete when clicking elsewhere on the card", () => {
      const onDelete = jest.fn();
      render(<UserCard user={mockUser} onDelete={onDelete} />);
      fireEvent.click(screen.getByTestId("user-username"));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  // ─── Different users ─────────────────────────────────────────────────
  it("renders different user data correctly", () => {
    const bob = { id: 99, username: "bob", email: "bob@test.org" };
    render(<UserCard user={bob} onDelete={jest.fn()} />);
    expect(screen.getByTestId("user-username")).toHaveTextContent("bob");
    expect(screen.getByTestId("user-email")).toHaveTextContent("bob@test.org");
  });
});
