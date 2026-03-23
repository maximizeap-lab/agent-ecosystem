// UserForm.jsx – create or edit a user
import React, { useState } from "react";
import PropTypes from "prop-types";

const INITIAL = { username: "", email: "" };

export default function UserForm({ onSuccess, initialValues = INITIAL }) {
  const [form, setForm] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = "Username is required";
    else if (form.username.length < 3) errs.username = "Username must be at least 3 characters";

    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = "Invalid email address";

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setServerError(null);
    try {
      const isEdit = Boolean(initialValues?.id);
      const url = isEdit ? `/api/users/${initialValues.id}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "An unexpected error occurred");
        return;
      }

      onSuccess(json);
      if (!isEdit) setForm(INITIAL);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="user-form" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          data-testid="input-username"
          value={form.username}
          onChange={handleChange}
          aria-describedby={errors.username ? "username-error" : undefined}
          aria-invalid={Boolean(errors.username)}
        />
        {errors.username && (
          <span id="username-error" data-testid="error-username" role="alert">
            {errors.username}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          data-testid="input-email"
          value={form.email}
          onChange={handleChange}
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <span id="email-error" data-testid="error-email" role="alert">
            {errors.email}
          </span>
        )}
      </div>

      {serverError && (
        <p data-testid="server-error" role="alert">
          {serverError}
        </p>
      )}

      <button data-testid="submit-btn" type="submit" disabled={submitting}>
        {submitting ? "Saving…" : initialValues?.id ? "Update User" : "Create User"}
      </button>
    </form>
  );
}

UserForm.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  initialValues: PropTypes.shape({
    id: PropTypes.number,
    username: PropTypes.string,
    email: PropTypes.string,
  }),
};
