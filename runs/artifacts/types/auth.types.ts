// ─────────────────────────────────────────────────────────────
//  Auth & RBAC — Type Definitions
// ─────────────────────────────────────────────────────────────

/** Every permission string understood by the system */
export type Permission =
  // Athlete management
  | "athlete:read"
  | "athlete:create"
  | "athlete:update"
  | "athlete:delete"
  // Training plans
  | "plan:read"
  | "plan:create"
  | "plan:update"
  | "plan:delete"
  // Performance data
  | "performance:read"
  | "performance:write"
  | "performance:export"
  // Analytics
  | "analytics:basic"
  | "analytics:advanced"
  // User/team management
  | "user:read"
  | "user:create"
  | "user:update"
  | "user:delete"
  | "user:assign_role"
  // System
  | "system:settings"
  | "system:audit_log"
  | "system:billing";

/** The three roles available in the platform */
export type Role = "admin" | "coach" | "athlete";

/** Numeric rank — higher = more privilege (used for hierarchy checks) */
export const ROLE_RANK: Record<Role, number> = {
  athlete: 1,
  coach: 2,
  admin: 3,
};

/** Permissions granted to each role (cumulative up the hierarchy) */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  athlete: [
    "athlete:read",
    "plan:read",
    "performance:read",
    "performance:write",
    "analytics:basic",
  ],
  coach: [
    "athlete:read",
    "athlete:create",
    "athlete:update",
    "plan:read",
    "plan:create",
    "plan:update",
    "performance:read",
    "performance:write",
    "performance:export",
    "analytics:basic",
    "analytics:advanced",
    "user:read",
  ],
  admin: [
    "athlete:read",
    "athlete:create",
    "athlete:update",
    "athlete:delete",
    "plan:read",
    "plan:create",
    "plan:update",
    "plan:delete",
    "performance:read",
    "performance:write",
    "performance:export",
    "analytics:basic",
    "analytics:advanced",
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "user:assign_role",
    "system:settings",
    "system:audit_log",
    "system:billing",
  ],
};

// ── Token shapes ────────────────────────────────────────────

export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  role: Role;
  iat: number;        // issued-at  (unix seconds)
  exp: number;        // expiry     (unix seconds)
  jti: string;        // unique token ID (for revocation)
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;  // seconds until access token expires
}

// ── User shapes ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
  teamId?: string;
  createdAt: string;  // ISO-8601
  lastLoginAt?: string;
  isActive: boolean;
}

export interface AuthenticatedUser extends User {
  permissions: Permission[];
}

// ── Auth state & actions ────────────────────────────────────

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  accessToken: string | null;
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
}

// ── API response wrappers ───────────────────────────────────

export interface AuthResponse {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}
