/**
 * authContext.jsx
 * Provides authentication state and actions to the entire React tree.
 *
 * Exposes via useAuth():
 *   user          – current user object (or null)
 *   isLoading     – true while the initial session check is running
 *   isAuthenticated
 *   login(credentials)
 *   logout()
 *   can(permission)        – checks a single RBAC permission
 *   canAll(permissions[])  – checks ALL permissions
 *   canAny(permissions[])  – checks ANY permission
 *   hasRole(...roles)      – checks if user has one of the given roles
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
} from "./authService.js";
import {
  userCan,
  roleHasAllPermissions,
  roleHasAnyPermission,
} from "./rbac.js";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  isLoading: true, // true until the silent-refresh boot check completes
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "BOOT_COMPLETE":
      return { ...state, isLoading: false, user: action.payload ?? null };

    case "LOGIN_SUCCESS":
      return { ...state, user: action.payload, error: null };

    case "LOGOUT":
      return { ...state, user: null, error: null };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── Boot: restore session silently on app load ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const session = await refreshSession();
      if (!cancelled) {
        dispatch({ type: "BOOT_COMPLETE", payload: session?.user ?? null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Listen for forced-logout events (e.g. refresh token expired) ───────────
  useEffect(() => {
    function handleForcedLogout() {
      dispatch({ type: "LOGOUT" });
    }
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (credentials) => {
    dispatch({ type: "CLEAR_ERROR" });
    try {
      const { user } = await apiLogin(credentials);
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
      return user;
    } catch (err) {
      const message =
        err.response?.data?.error ?? "Login failed. Please try again.";
      dispatch({ type: "SET_ERROR", payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    dispatch({ type: "LOGOUT" });
  }, []);

  // ── RBAC helpers (memoized per user change) ─────────────────────────────────

  const can = useCallback(
    (permission) => userCan(state.user, permission),
    [state.user]
  );

  const canAll = useCallback(
    (permissions) => {
      if (!state.user?.role) return false;
      return roleHasAllPermissions(state.user.role, permissions);
    },
    [state.user]
  );

  const canAny = useCallback(
    (permissions) => {
      if (!state.user?.role) return false;
      return roleHasAnyPermission(state.user.role, permissions);
    },
    [state.user]
  );

  const hasRole = useCallback(
    (...roles) => {
      if (!state.user?.role) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  // ── Context value ────────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      user: state.user,
      isLoading: state.isLoading,
      isAuthenticated: !!state.user,
      error: state.error,
      login,
      logout,
      can,
      canAll,
      canAny,
      hasRole,
    }),
    [state, login, logout, can, canAll, canAny, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the auth context. Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}

export default AuthContext;
