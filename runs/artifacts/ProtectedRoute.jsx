/**
 * ProtectedRoute.jsx
 * A React Router v6 wrapper that guards routes by authentication status,
 * required role(s), or specific RBAC permissions.
 *
 * Props:
 *   roles         {string[]}  – at least one of these roles is required
 *   permissions   {string[]}  – ALL of these permissions are required
 *   anyPermission {string[]}  – AT LEAST ONE of these permissions is required
 *   redirectTo    {string}    – where to send unauthenticated users (default: "/login")
 *   fallback      {ReactNode} – shown while the auth boot check is in progress
 *
 * Examples:
 *   <ProtectedRoute />                             — any authenticated user
 *   <ProtectedRoute roles={['admin']} />           — admin only
 *   <ProtectedRoute roles={['admin','coach']} />   — admin or coach
 *   <ProtectedRoute permissions={['manage:settings']} />
 *   <ProtectedRoute anyPermission={['view:all_analytics','view:own_analytics']} />
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext.jsx";

// ─── Loading Fallback ─────────────────────────────────────────────────────────

function DefaultLoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Checking authentication"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <span className="sr-only">Loading…</span>
      {/* Replace with your project's spinner component */}
      <div className="spinner" />
    </div>
  );
}

// ─── Unauthorized Page ────────────────────────────────────────────────────────

function DefaultUnauthorized() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "1rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "2rem" }}>403 — Access Denied</h1>
      <p style={{ color: "#6b7280" }}>
        You do not have permission to view this page.
      </p>
      <a href="/dashboard" style={{ color: "#2563eb" }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

export default function ProtectedRoute({
  roles = [],
  permissions = [],
  anyPermission = [],
  redirectTo = "/login",
  fallback = <DefaultLoadingFallback />,
  unauthorizedComponent = <DefaultUnauthorized />,
}) {
  const { user, isLoading, isAuthenticated, hasRole, canAll, canAny } =
    useAuth();
  const location = useLocation();

  // 1. Still performing the initial session check
  if (isLoading) return fallback;

  // 2. Not authenticated — send to login, preserve intended destination
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Role check (if any roles specified, user must match at least one)
  if (roles.length > 0 && !hasRole(...roles)) {
    return unauthorizedComponent;
  }

  // 4. "All permissions" check
  if (permissions.length > 0 && !canAll(permissions)) {
    return unauthorizedComponent;
  }

  // 5. "Any permission" check
  if (anyPermission.length > 0 && !canAny(anyPermission)) {
    return unauthorizedComponent;
  }

  // 6. All checks passed — render child routes
  return <Outlet />;
}
