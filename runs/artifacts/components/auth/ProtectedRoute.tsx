"use client";
// ─────────────────────────────────────────────────────────────
//  ProtectedRoute — Declarative route guard component
//
//  Wraps any page/layout and redirects or shows a fallback when
//  the user lacks the required role / permissions.
//
//  Usage:
//    <ProtectedRoute minRole="coach">
//      <CoachPage />
//    </ProtectedRoute>
//
//    <ProtectedRoute requirePermissions={["user:assign_role"]}>
//      <RoleManager />
//    </ProtectedRoute>
// ─────────────────────────────────────────────────────────────

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { RouteGuard, evaluateGuard } from "../../lib/rbac";
import { Permission, Role } from "../../types/auth.types";

interface ProtectedRouteProps extends RouteGuard {
  children: React.ReactNode;
  /** Path to redirect to when access is denied (default: /login) */
  redirectTo?: string;
  /** Custom component to render instead of redirecting */
  fallback?: React.ReactNode;
  /** Show a loading spinner while auth is being resolved */
  loadingFallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
  fallback,
  loadingFallback,
  ...guard
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const { allowed, reason } = evaluateGuard(guard, user);

  useEffect(() => {
    if (isLoading) return;

    if (guard.guestOnly && isAuthenticated) {
      router.replace(getDashboardPath(user?.role));
      return;
    }

    if (!allowed && !fallback) {
      const next = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname : "/"
      );
      router.replace(
        isAuthenticated ? "/unauthorized" : `${redirectTo}?next=${next}`
      );
    }
  }, [isLoading, allowed, isAuthenticated]);

  if (isLoading) {
    return loadingFallback ? <>{loadingFallback}</> : <AuthLoadingScreen />;
  }

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return null; // redirect is handled in useEffect
  }

  return <>{children}</>;
}

function getDashboardPath(role?: string): string {
  switch (role) {
    case "admin":   return "/dashboard/admin";
    case "coach":   return "/dashboard/coach";
    case "athlete": return "/dashboard/athlete";
    default:        return "/dashboard";
  }
}

// ── Loading screen ───────────────────────────────────────────

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Verifying session…</p>
      </div>
    </div>
  );
}

// ── Permission Gate (inline guard — no redirect) ─────────────

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  anyOf?: Permission[];
  minRole?: Role;
  allowedRoles?: Role[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Inline gate — renders `children` when the user has access,
 * `fallback` (or nothing) otherwise. No redirect.
 *
 * @example
 * <PermissionGate permission="user:delete" fallback={<Tooltip>No access</Tooltip>}>
 *   <DeleteButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  permissions,
  anyOf,
  minRole,
  allowedRoles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { user } = useAuth();

  const guard: RouteGuard = {
    minRole,
    allowedRoles,
    requirePermissions: permission ? [permission] : permissions,
    requireAnyPermission: anyOf,
  };

  const { allowed } = evaluateGuard(guard, user);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
