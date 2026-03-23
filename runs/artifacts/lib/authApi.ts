// ─────────────────────────────────────────────────────────────
//  Auth API Client
//  Wraps every auth-related HTTP call.
//  Swap the BASE_URL and this file becomes production-ready.
// ─────────────────────────────────────────────────────────────

import {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  TokenPair,
  User,
  ROLE_PERMISSIONS,
  AuthenticatedUser,
} from "../types/auth.types";
import { authorizationHeader, getRefreshToken } from "./tokenService";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// ── Generic fetch wrapper ────────────────────────────────────

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...init } = options;
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeader(),
      ...(init.headers as Record<string, string>),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message ?? "Request failed");
    (error as any).statusCode = response.status;
    (error as any).code = data.code ?? "UNKNOWN";
    throw error;
  }

  return data as T;
}

// ── Auth endpoints ───────────────────────────────────────────

/**
 * POST /auth/login
 */
export async function apiLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/**
 * POST /auth/register
 */
export async function apiRegister(
  payload: RegisterPayload
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /auth/refresh  — rotate access token using refresh token
 */
export async function apiRefreshToken(): Promise<TokenPair> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  return request<TokenPair>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * POST /auth/logout  — revoke tokens server-side
 */
export async function apiLogout(): Promise<void> {
  const refreshToken = getRefreshToken();
  await request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {
    // Swallow errors — local cleanup always happens regardless
  });
}

/**
 * GET /auth/me  — validate session and return current user
 */
export async function apiGetMe(): Promise<AuthenticatedUser> {
  return request<AuthenticatedUser>("/auth/me");
}

/**
 * POST /auth/forgot-password
 */
export async function apiForgotPassword(email: string): Promise<void> {
  await request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * POST /auth/reset-password
 */
export async function apiResetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  await request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

// ── User management (admin only) ─────────────────────────────

export async function apiGetUsers(): Promise<User[]> {
  return request<User[]>("/users");
}

export async function apiUpdateUserRole(
  userId: string,
  role: User["role"]
): Promise<User> {
  return request<User>(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function apiDeactivateUser(userId: string): Promise<User> {
  return request<User>(`/users/${userId}/deactivate`, { method: "POST" });
}

// ── Mock shim (development only) ─────────────────────────────
// Replace with real backend calls in production.

export const MOCK_USERS: Record<string, AuthenticatedUser> = {
  "admin@dashboard.io": {
    id: "u-001",
    email: "admin@dashboard.io",
    firstName: "Alex",
    lastName: "Reed",
    role: "admin",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    createdAt: "2024-01-01T00:00:00Z",
    lastLoginAt: new Date().toISOString(),
    isActive: true,
    permissions: ROLE_PERMISSIONS["admin"],
  },
  "coach@dashboard.io": {
    id: "u-002",
    email: "coach@dashboard.io",
    firstName: "Jordan",
    lastName: "Mills",
    role: "coach",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
    createdAt: "2024-01-15T00:00:00Z",
    lastLoginAt: new Date().toISOString(),
    isActive: true,
    permissions: ROLE_PERMISSIONS["coach"],
  },
  "athlete@dashboard.io": {
    id: "u-003",
    email: "athlete@dashboard.io",
    firstName: "Sam",
    lastName: "Park",
    role: "athlete",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
    teamId: "team-001",
    createdAt: "2024-02-01T00:00:00Z",
    lastLoginAt: new Date().toISOString(),
    isActive: true,
    permissions: ROLE_PERMISSIONS["athlete"],
  },
};

export const MOCK_PASSWORDS: Record<string, string> = {
  "admin@dashboard.io": "Admin@123",
  "coach@dashboard.io": "Coach@123",
  "athlete@dashboard.io": "Athlete@123",
};
