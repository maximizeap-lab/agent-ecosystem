// UserList.jsx – displays a paginated list of users
import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";

export function UserCard({ user, onDelete }) {
  return (
    <div data-testid="user-card" className="user-card">
      <h3 data-testid="user-username">{user.username}</h3>
      <p data-testid="user-email">{user.email}</p>
      <button
        data-testid="delete-btn"
        onClick={() => onDelete(user.id)}
        aria-label={`Delete ${user.username}`}
      >
        Delete
      </button>
    </div>
  );
}

UserCard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.number.isRequired,
    username: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async (currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?page=${currentPage}&per_page=5`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const handleDelete = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p data-testid="loading-indicator">Loading…</p>;
  if (error) return <p data-testid="error-message" role="alert">{error}</p>;

  return (
    <div data-testid="user-list">
      {users.length === 0 ? (
        <p data-testid="empty-state">No users found.</p>
      ) : (
        users.map((user) => (
          <UserCard key={user.id} user={user} onDelete={handleDelete} />
        ))
      )}

      <div data-testid="pagination" className="pagination">
        <button
          data-testid="prev-page"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span data-testid="page-info">
          Page {page} of {totalPages}
        </span>
        <button
          data-testid="next-page"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
