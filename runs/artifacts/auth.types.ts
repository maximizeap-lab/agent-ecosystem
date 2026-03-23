// ============================================================
// auth.types.ts — Shared type definitions for auth & RBAC
// ============================================================

export type Role = "admin" | "coach" | "athlete";

export type Permission =
  // User management
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete"
  // Athlete profiles
  | "athletes:read"
  | "athletes:create"
  | "athletes:update"
  | "athletes:delete"
  // Training plans
  | "plans:read"
  | "plans:create"
  | "plans:update"
  | "plans:delete"
  // Performance data
  | "performance:read"
  | "performance:create"
  | "performance:update"
  | "performance:delete"
  // Reports & analytics
  | "reports:read"
  | "reports:export"
  // System settings
  | "settings:read"
  | "settings:update";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
  teamId?: string;         // coaches & athletes belong to a team
  coachId?: string;        // athletes are assigned to a coach
  isActive: boolean;
  createdAt: string;       // ISO date string
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // seconds until access token expires
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  teamId?: string;
  coachId?: string;
}

export interface JwtPayload {
  sub: string;             // user id
  email: string;
  role: Role;
  teamId?: string;
  iat: number;
  exp: number;
}

// API response shapes
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
}
