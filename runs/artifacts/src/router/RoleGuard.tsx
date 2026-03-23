import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "@store/authStore";
import type { Permission, UserRole } from "@types/index";
import { ROUTES } from "@constants/index";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  /** When true, ALL listed permissions must be present (default: true). */
  requireAll?: boolean;
  /** Custom fallback instead of redirecting to /403. */
  fallback?: ReactNode;
}

/**
 * RoleGuard — Fine-grained access control for individual routes/components.
 *
 * Checks:
 *  1. Optional role check  — user.role must match `requiredRole`.
 *  2. Optional permission check — user must hold every (or any) permission in
 *     `requiredPermissions`, depending on the `requireAll` flag.
 *
 * On failure → redirects to /403 (or renders `fallback` if provided).
 */
export function RoleGuard({
  children,
  requiredRole,
  requiredPermissions = [],
  requireAll = true,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // ── Role check ─────────────────────────────────────────────────────────────
  if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <Navigate to={ROUTES.FORBIDDEN} replace />
    );
  }

  // ── Permission check ───────────────────────────────────────────────────────
  if (requiredPermissions.length > 0) {
    const userPermissions = new Set(user.permissions);

    const hasAccess = requireAll
      ? requiredPermissions.every((p) => userPermissions.has(p))
      : requiredPermissions.some((p) => userPermissions.has(p));

    if (!hasAccess) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <Navigate to={ROUTES.FORBIDDEN} replace />
      );
    }
  }

  return <>{children}</>;
}
