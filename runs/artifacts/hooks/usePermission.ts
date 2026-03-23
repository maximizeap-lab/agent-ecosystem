// ─────────────────────────────────────────────────────────────
//  usePermission — Granular permission hooks
//  Use these in components to conditionally render UI elements.
// ─────────────────────────────────────────────────────────────

import { useAuth } from "../context/AuthContext";
import { Permission, Role } from "../types/auth.types";
import { RouteGuard, evaluateGuard } from "../lib/rbac";

/**
 * Check a single permission.
 *
 * @example
 * const canExport = usePermission("performance:export");
 * {canExport && <ExportButton />}
 */
export function usePermission(permission: Permission): boolean {
  const { can } = useAuth();
  return can(permission);
}

/**
 * Check multiple permissions — returns true only if user has ALL of them.
 */
export function usePermissions(permissions: Permission[]): boolean {
  const { canAll } = useAuth();
  return canAll(permissions);
}

/**
 * Returns true if the user has AT LEAST ONE of the supplied permissions.
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = useAuth();
  return canAny(permissions);
}

/**
 * Check whether the current user matches a role exactly.
 */
export function useRole(role: Role): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

/**
 * Returns true when the current user's role is at least `minRole`.
 *
 * @example
 * const isCoachOrAbove = useAtLeastRole("coach");
 */
export function useAtLeastRole(minRole: Role): boolean {
  const { atLeastRole } = useAuth();
  return atLeastRole(minRole);
}

/**
 * Evaluate a full RouteGuard descriptor and return { allowed, reason }.
 * Useful for imperative checks inside event handlers.
 */
export function useGuard(guard: RouteGuard): { allowed: boolean; reason?: string } {
  const { user } = useAuth();
  return evaluateGuard(guard, user);
}
