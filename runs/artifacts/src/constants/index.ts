// ─── App Constants ────────────────────────────────────────────────────────────

export const APP_NAME = "ModernApp";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "Modern React Application";

// ─── API Constants ────────────────────────────────────────────────────────────

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
export const API_TIMEOUT = 30_000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;

// ─── Auth Constants ───────────────────────────────────────────────────────────

export const TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const USER_KEY = "auth_user";
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in ms

// ─── Route Paths ─────────────────────────────────────────────────────────────

export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password/:token",
  VERIFY_EMAIL: "/verify-email/:token",

  // Protected - Dashboard
  DASHBOARD: "/dashboard",

  // Protected - Users
  USERS: "/users",
  USERS_CREATE: "/users/create",
  USERS_DETAIL: "/users/:id",
  USERS_EDIT: "/users/:id/edit",

  // Protected - Content
  CONTENT: "/content",
  CONTENT_CREATE: "/content/create",
  CONTENT_DETAIL: "/content/:id",
  CONTENT_EDIT: "/content/:id/edit",

  // Protected - Analytics
  ANALYTICS: "/analytics",
  ANALYTICS_OVERVIEW: "/analytics/overview",
  ANALYTICS_REPORTS: "/analytics/reports",

  // Protected - Settings
  SETTINGS: "/settings",
  SETTINGS_PROFILE: "/settings/profile",
  SETTINGS_SECURITY: "/settings/security",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_APPEARANCE: "/settings/appearance",

  // Error Pages
  NOT_FOUND: "/404",
  FORBIDDEN: "/403",
  SERVER_ERROR: "/500",
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// ─── UI Constants ─────────────────────────────────────────────────────────────

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 72;
export const HEADER_HEIGHT = 64;
export const ANIMATION_DURATION = 200; // ms

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  AUTH: {
    ME: ["auth", "me"],
  },
  USERS: {
    ALL: ["users"],
    LIST: (params?: object) => ["users", "list", params],
    DETAIL: (id: string) => ["users", "detail", id],
  },
  CONTENT: {
    ALL: ["content"],
    LIST: (params?: object) => ["content", "list", params],
    DETAIL: (id: string) => ["content", "detail", id],
  },
  ANALYTICS: {
    STATS: ["analytics", "stats"],
    CHART: (range: string) => ["analytics", "chart", range],
    REPORTS: ["analytics", "reports"],
  },
  SETTINGS: {
    APP: ["settings", "app"],
  },
} as const;

// ─── Local Storage Keys ───────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  THEME: "app_theme",
  SIDEBAR_COLLAPSED: "sidebar_collapsed",
  LANGUAGE: "app_language",
  RECENT_SEARCHES: "recent_searches",
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  TITLE_MAX_LENGTH: 200,
} as const;
