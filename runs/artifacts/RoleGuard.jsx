/**
 * RoleGuard.jsx
 * Component-level visibility guard. Conditionally renders its children
 * based on the current user's role or permissions.
 *
 * Props:
 *   roles         {string[]}  – render if user has ANY of these roles
 *   permissions   {string[]}  – render if user has ALL of these permissions
 *   anyPermission {string[]}  – render if user has ANY of these permissions
 *   fallback      {ReactNode} – what to render when access is denied (default: nothing)
 *   negate        {boolean}   – invert the check (render for DENIED users instead)
 *
 * Examples:
 *   <RoleGuard roles={['admin']}>
 *     <DeleteUserButton />
 *   </RoleGuard>
 *
 *   <RoleGuard permissions={['manage:settings']}>
 *     <SettingsPanel />
 *   </RoleGuard>
 *
 *   <RoleGuard roles={['athlete']} negate>
 *     <CoachOnlyBanner />
 *   </RoleGuard>
 *
 *   <RoleGuard
 *     anyPermission={['view:all_analytics', 'export:analytics']}
 *     fallback={<p>Upgrade your plan to view analytics.</p>}
 *   >
 *     <AnalyticsWidget />
 *   </RoleGuard>
 */

import React from "react";
import { useAuth } from "./authContext.jsx";

export default function RoleGuard({
  roles = [],
  permissions = [],
  anyPermission = [],
  fallback = null,
  negate = false,
  children,
}) {
  const { isAuthenticated, isLoading, hasRole, canAll, canAny } = useAuth();

  // Do not render anything while the auth state is being determined
  if (isLoading) return null;

  // Unauthenticated users can never pass a role/permission guard
  if (!isAuthenticated) return negate ? children : fallback;

  let allowed = true;

  if (roles.length > 0) {
    allowed = allowed && hasRole(...roles);
  }

  if (permissions.length > 0) {
    allowed = allowed && canAll(permissions);
  }

  if (anyPermission.length > 0) {
    allowed = allowed && canAny(anyPermission);
  }

  const shouldRender = negate ? !allowed : allowed;

  return shouldRender ? children : fallback;
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** Renders children only when the user is an admin. */
export function AdminOnly({ children, fallback = null }) {
  return (
    <RoleGuard roles={["admin"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Renders children only when the user is a coach or admin. */
export function CoachOrAdmin({ children, fallback = null }) {
  return (
    <RoleGuard roles={["admin", "coach"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/** Renders children only when the user is an athlete. */
export function AthleteOnly({ children, fallback = null }) {
  return (
    <RoleGuard roles={["athlete"]} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}
