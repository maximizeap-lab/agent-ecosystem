import { useMemo } from "react";
import { useAuthStore } from "@store/authStore";
import type { Permission, UserRole } from "@types/index";

/**
 * usePermission — Reactive permission / role checks for use in components.
 *
 * Usage:
 *   const { can, is } = usePermission();
 *   if (can("write:users")) { ... }
 *   if (is("admin")) { ... }
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);

  const permissionSet = useMemo(
    () => new Set<Permission>(user?.permissions ?? []),
    [user]
  );

  /**
   * Check if the user holds a single permission.
   */
  const can = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true; // admin bypass
    return permissionSet.has(permission);
  };

  /**
   * Check if the user holds ALL listed permissions.
   */
  const canAll = (...permissions: Permission[]): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return permissions.every((p) => permissionSet.has(p));
  };

  /**
   * Check if the user holds AT LEAST ONE of the listed permissions.
   */
  const canAny = (...permissions: Permission[]): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return permissions.some((p) => permissionSet.has(p));
  };

  /**
   * Check if the user has the given role (or admin).
   */
  const is = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role || user.role === "admin";
  };

  /**
   * Check if the user has any of the given roles.
   */
  const isAny = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role) || user.role === "admin";
  };

  return { can, canAll, canAny, is, isAny, role: user?.role };
}
