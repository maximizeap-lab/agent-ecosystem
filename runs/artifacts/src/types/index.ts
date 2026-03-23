// ─── User & Auth Types ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "manager" | "editor" | "viewer";

export type Permission =
  | "read:users"
  | "write:users"
  | "delete:users"
  | "read:content"
  | "write:content"
  | "delete:content"
  | "read:analytics"
  | "manage:settings";

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

// ─── Route Types ─────────────────────────────────────────────────────────────

export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  children?: RouteConfig[];
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  isPublic?: boolean;
  showInNav?: boolean;
}

// ─── UI / Component Types ─────────────────────────────────────────────────────

export type ThemeMode = "light" | "dark" | "system";

export type Size = "xs" | "sm" | "md" | "lg" | "xl";

export type Variant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost"
  | "outline";

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
  requiredPermissions?: Permission[];
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: Size;
  children: React.ReactNode;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
}

// ─── Dashboard / Analytics Types ─────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  growth: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

// ─── Content / Post Types ─────────────────────────────────────────────────────

export type ContentStatus = "draft" | "published" | "archived";

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: ContentStatus;
  author: Pick<User, "id" | "firstName" | "lastName" | "avatar">;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export interface AppSettings {
  theme: ThemeMode;
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
}

export interface PrivacySettings {
  profileVisibility: "public" | "private" | "friends";
  showEmail: boolean;
  showActivity: boolean;
}
