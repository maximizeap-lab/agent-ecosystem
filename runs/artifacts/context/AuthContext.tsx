"use client";
// ─────────────────────────────────────────────────────────────
//  AuthContext — React Context + Provider
//  Exposes the full auth state and every auth action to the tree.
// ─────────────────────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import {
  AuthState,
  AuthenticatedUser,
  LoginCredentials,
  RegisterPayload,
  Permission,
  Role,
  ROLE_PERMISSIONS,
} from "../types/auth.types";

import {
  saveTokens,
  clearTokens,
  getValidAccessToken,
  getRefreshToken,
  isTokenValid,
  tokenTtlSeconds,
  decodeToken,
} from "../lib/tokenService";

import {
  apiLogin,
  apiLogout,
  apiRegister,
  apiRefreshToken,
  apiGetMe,
  apiForgotPassword,
  MOCK_USERS,
  MOCK_PASSWORDS,
} from "../lib/authApi";

import { userCan, userCanAll, userCanAny, isAtLeastRole } from "../lib/rbac";

// ── Reducer ──────────────────────────────────────────────────

type AuthAction =
  | { type: "AUTH_LOADING" }
  | { type: "AUTH_SUCCESS"; payload: { user: AuthenticatedUser; accessToken: string } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "CLEAR_ERROR" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_LOADING":
      return { ...state, status: "loading", error: null };
    case "AUTH_SUCCESS":
      return {
        status: "authenticated",
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        status: "unauthenticated",
        user: null,
        accessToken: null,
        error: action.payload,
      };
    case "AUTH_LOGOUT":
      return {
        status: "unauthenticated",
        user: null,
        accessToken: null,
        error: null,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

const INITIAL_STATE: AuthState = {
  status: "idle",
  user: null,
  accessToken: null,
  error: null,
};

// ── Context shape ────────────────────────────────────────────

export interface AuthContextValue extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;

  // Permission helpers (convenience wrappers)
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  hasRole: (role: Role) => boolean;
  atLeastRole: (role: Role) => boolean;

  // Status helpers
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true" ||
  process.env.NODE_ENV === "development";

// Simulated JWT for mock mode
function makeMockToken(userId: string, expiresIn = 3600): string {
  const header  = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      jti: Math.random().toString(36).slice(2),
    })
  );
  const signature = "mock_sig";
  return `${header}.${payload}.${signature}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Token refresh scheduling ─────────────────────────────

  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const ttl = tokenTtlSeconds(accessToken);
    // Refresh 2 minutes before expiry (or immediately if TTL < 2 min)
    const delay = Math.max((ttl - 120) * 1000, 0);
    refreshTimerRef.current = setTimeout(() => {
      refreshSession();
    }, delay);
  }, []);

  // ── Session restore on mount ─────────────────────────────

  useEffect(() => {
    const restore = async () => {
      dispatch({ type: "AUTH_LOADING" });
      const token = getValidAccessToken();

      if (!token) {
        // Try to use refresh token to get a new access token
        if (getRefreshToken()) {
          try {
            await refreshSession();
            return;
          } catch {
            /* fall through to unauthenticated */
          }
        }
        dispatch({ type: "AUTH_FAILURE", payload: "" });
        return;
      }

      try {
        let user: AuthenticatedUser;
        if (USE_MOCK) {
          const payload = decodeToken(token);
          const found = Object.values(MOCK_USERS).find(
            (u) => u.id === payload?.sub
          );
          if (!found) throw new Error("User not found");
          user = found;
        } else {
          user = await apiGetMe();
        }
        dispatch({ type: "AUTH_SUCCESS", payload: { user, accessToken: token } });
        scheduleRefresh(token);
      } catch {
        clearTokens();
        dispatch({ type: "AUTH_FAILURE", payload: "" });
      }
    };

    restore();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch({ type: "AUTH_LOADING" });
      try {
        let user: AuthenticatedUser;
        let accessToken: string;

        if (USE_MOCK) {
          // ── Mock auth ─────────────────────────────────────
          await new Promise((r) => setTimeout(r, 600)); // fake network
          const mockUser = MOCK_USERS[credentials.email];
          const correctPw = MOCK_PASSWORDS[credentials.email];

          if (!mockUser || correctPw !== credentials.password) {
            throw new Error("Invalid email or password");
          }

          accessToken = makeMockToken(mockUser.id);
          const refreshToken = makeMockToken(mockUser.id, 60 * 60 * 24 * 7);

          saveTokens(
            { accessToken, refreshToken, expiresIn: 3600 },
            credentials.rememberMe
          );
          user = { ...mockUser, lastLoginAt: new Date().toISOString() };
        } else {
          // ── Real API auth ─────────────────────────────────
          const response = await apiLogin(credentials);
          saveTokens(response.tokens, credentials.rememberMe);
          accessToken = response.tokens.accessToken;
          user = response.user;
        }

        dispatch({ type: "AUTH_SUCCESS", payload: { user, accessToken } });
        scheduleRefresh(accessToken);
      } catch (err: any) {
        dispatch({
          type: "AUTH_FAILURE",
          payload: err.message ?? "Login failed",
        });
        throw err;
      }
    },
    [scheduleRefresh]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      dispatch({ type: "AUTH_LOADING" });
      try {
        const response = await apiRegister(payload);
        saveTokens(response.tokens, true);
        dispatch({
          type: "AUTH_SUCCESS",
          payload: {
            user: response.user,
            accessToken: response.tokens.accessToken,
          },
        });
        scheduleRefresh(response.tokens.accessToken);
      } catch (err: any) {
        dispatch({
          type: "AUTH_FAILURE",
          payload: err.message ?? "Registration failed",
        });
        throw err;
      }
    },
    [scheduleRefresh]
  );

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await apiLogout();
    clearTokens();
    dispatch({ type: "AUTH_LOGOUT" });
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiForgotPassword(email);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      if (USE_MOCK) {
        // In mock mode, just re-issue a token
        const current = getValidAccessToken();
        if (!current) return;
        const payload = decodeToken(current);
        if (!payload) return;
        const newToken = makeMockToken(payload.sub);
        saveTokens({ accessToken: newToken, refreshToken: current, expiresIn: 3600 });
        scheduleRefresh(newToken);
        return;
      }

      const tokens = await apiRefreshToken();
      saveTokens(tokens, true);
      const user = await apiGetMe();
      dispatch({
        type: "AUTH_SUCCESS",
        payload: { user, accessToken: tokens.accessToken },
      });
      scheduleRefresh(tokens.accessToken);
    } catch {
      clearTokens();
      dispatch({ type: "AUTH_LOGOUT" });
    }
  }, [scheduleRefresh]);

  const clearError = useCallback(() => dispatch({ type: "CLEAR_ERROR" }), []);

  // ── Permission helpers ───────────────────────────────────

  const can = useCallback(
    (permission: Permission) => (state.user ? userCan(state.user, permission) : false),
    [state.user]
  );

  const canAll = useCallback(
    (permissions: Permission[]) =>
      state.user ? userCanAll(state.user, permissions) : false,
    [state.user]
  );

  const canAny = useCallback(
    (permissions: Permission[]) =>
      state.user ? userCanAny(state.user, permissions) : false,
    [state.user]
  );

  const hasRole = useCallback(
    (role: Role) => state.user?.role === role,
    [state.user]
  );

  const atLeastRole = useCallback(
    (role: Role) =>
      state.user ? isAtLeastRole(state.user.role, role) : false,
    [state.user]
  );

  // ── Context value ────────────────────────────────────────

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    forgotPassword,
    clearError,
    refreshSession,
    can,
    canAll,
    canAny,
    hasRole,
    atLeastRole,
    isAuthenticated: state.status === "authenticated",
    isLoading: state.status === "loading" || state.status === "idle",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
