// ============================================================
// permissions.ts — Role-to-permission mapping (single source of truth)
// ============================================================

import type { Permission, Role } from "./auth.types";

/**
 * ROLE_PERMISSIONS defines every permission granted to each role.
 * Roles are NOT hierarchical by inheritance — permissions are explicit,
 * which makes auditing and future changes straightforward.
 *
 * Hierarchy (for documentation purposes):
 *   admin   ⊃ coach   ⊃ athlete
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // Full user management
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    // Full athlete management
    "athletes:read",
    "athletes:create",
    "athletes:update",
    "athletes:delete",
    // Full training plan management
    "plans:read",
    "plans:create",
    "plans:update",
    "plans:delete",
    // Full performance data management
    "performance:read",
    "performance:create",
    "performance:update",
    "performance:delete",
    // Full reports access
    "reports:read",
    "reports:export",
    // System settings
    "settings:read",
    "settings:update",
  ],

  coach: [
    // Can read all users; cannot create/delete accounts
    "users:read",
    // Full athlete management for their team
    "athletes:read",
    "athletes:create",
    "athletes:update",
    // Full training plan management
    "plans:read",
    "plans:create",
    "plans:update",
    "plans:delete",
    // Full performance data management
    "performance:read",
    "performance:create",
    "performance:update",
    // Reports (read + export)
    "reports:read",
    "reports:export",
    // Can view settings, not change them
    "settings:read",
  ],

  athlete: [
    // Can only read own profile (enforced at query level)
    "athletes:read",
    // Can view their assigned plans, not create/modify
    "plans:read",
    // Can log and read own performance data
    "performance:read",
    "performance:create",
    // Can read own reports
    "reports:read",
  ],
};

// ── Helpers ──────────────────────────────────────────────────

/**
 * Returns true if `role` has ALL of the specified permissions.
 */
export function hasPermissions(role: Role, required: Permission[]): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return required.every((p) => granted.includes(p));
}

/**
 * Returns true if `role` has AT LEAST ONE of the specified permissions.
 */
export function hasAnyPermission(role: Role, any: Permission[]): boolean {
  const granted = ROLE_PERMISSIONS[role];
  return any.some((p) => granted.includes(p));
}

/**
 * Returns the full permission set for a given role.
 */
export function getPermissions(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * Convenience: roles ordered by privilege level (highest first).
 */
export const ROLE_HIERARCHY: Role[] = ["admin", "coach", "athlete"];

/**
 * Returns true if `role` is at least as privileged as `minimumRole`.
 */
export function meetsMinimumRole(role: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(role) <= ROLE_HIERARCHY.indexOf(minimumRole);
}
