// ─────────────────────────────────────────────────────────────
//  RBAC — Permission Engine
//  Pure functions — no React, no side-effects.
//  Import anywhere: server middleware, React hooks, tests.
// ─────────────────────────────────────────────────────────────

import {
  Permission,
  Role,
  ROLE_PERMISSIONS,
  ROLE_RANK,
  AuthenticatedUser,
} from "../types/auth.types";

// ── Core checks ─────────────────────────────────────────────

/**
 * Returns the full permission list for a role.
 * Roles do NOT automatically inherit parent-role permissions in the
 * permission map (already expanded in ROLE_PERMISSIONS), but this
 * helper is the single source of truth for "what can this role do".
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Returns true when the role possesses ALL requested permissions.
 */
export function roleHasAllPermissions(
  role: Role,
  required: Permission[]
): boolean {
  const granted = new Set(getPermissionsForRole(role));
  return required.every((p) => granted.has(p));
}

/**
 * Returns true when the role possesses AT LEAST ONE of the permissions.
 */
export function roleHasAnyPermission(
  role: Role,
  oneOf: Permission[]
): boolean {
  const granted = new Set(getPermissionsForRole(role));
  return oneOf.some((p) => granted.has(p));
}

/**
 * Checks a user object (already carries its permission array).
 */
export function userCan(user: AuthenticatedUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

export function userCanAll(
  user: AuthenticatedUser,
  permissions: Permission[]
): boolean {
  const set = new Set(user.permissions);
  return permissions.every((p) => set.has(p));
}

export function userCanAny(
  user: AuthenticatedUser,
  permissions: Permission[]
): boolean {
  const set = new Set(user.permissions);
  return permissions.some((p) => set.has(p));
}

// ── Role hierarchy ───────────────────────────────────────────

/**
 * True if `roleA` has equal or higher privilege than `roleB`.
 *
 * Example:  isAtLeastRole("admin", "coach") → true
 *           isAtLeastRole("athlete", "coach") → false
 */
export function isAtLeastRole(roleA: Role, roleB: Role): boolean {
  return ROLE_RANK[roleA] >= ROLE_RANK[roleB];
}

export function isExactRole(user: AuthenticatedUser, role: Role): boolean {
  return user.role === role;
}

// ── Route guard descriptors ──────────────────────────────────

export interface RouteGuard {
  /** Minimum role required (inclusive, hierarchy-aware). */
  minRole?: Role;
  /** User must be exactly one of these roles. */
  allowedRoles?: Role[];
  /** User must hold ALL of these permissions. */
  requirePermissions?: Permission[];
  /** User must hold AT LEAST ONE of these permissions. */
  requireAnyPermission?: Permission[];
  /** If true, the route is only accessible to unauthenticated users (e.g. /login). */
  guestOnly?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Evaluate a RouteGuard against a user (or null = unauthenticated).
 */
export function evaluateGuard(
  guard: RouteGuard,
  user: AuthenticatedUser | null
): GuardResult {
  // Guest-only pages (login, register)
  if (guard.guestOnly) {
    if (user) {
      return { allowed: false, reason: "Already authenticated" };
    }
    return { allowed: true };
  }

  // Everything below requires authentication
  if (!user) {
    return { allowed: false, reason: "Authentication required" };
  }

  // Minimum role check
  if (guard.minRole && !isAtLeastRole(user.role, guard.minRole)) {
    return {
      allowed: false,
      reason: `Requires at least role '${guard.minRole}', you have '${user.role}'`,
    };
  }

  // Allowed-roles allowlist
  if (guard.allowedRoles && !guard.allowedRoles.includes(user.role)) {
    return {
      allowed: false,
      reason: `Role '${user.role}' is not allowed on this page`,
    };
  }

  // All-permissions check
  if (
    guard.requirePermissions &&
    !userCanAll(user, guard.requirePermissions)
  ) {
    const missing = guard.requirePermissions.filter(
      (p) => !user.permissions.includes(p)
    );
    return {
      allowed: false,
      reason: `Missing permissions: ${missing.join(", ")}`,
    };
  }

  // Any-permission check
  if (
    guard.requireAnyPermission &&
    !userCanAny(user, guard.requireAnyPermission)
  ) {
    return {
      allowed: false,
      reason: `Requires one of: ${guard.requireAnyPermission.join(", ")}`,
    };
  }

  return { allowed: true };
}
