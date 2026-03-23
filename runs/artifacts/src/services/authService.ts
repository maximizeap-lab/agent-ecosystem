import { api } from "./apiClient";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@types/index";

export const authService = {
  /**
   * Authenticate with email + password.
   * Returns user profile, access token, and refresh token.
   */
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>("/auth/login", credentials),

  /**
   * Register a new account.
   */
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>("/auth/register", payload),

  /**
   * Invalidate the current session on the server.
   */
  logout: () => api.post<void>("/auth/logout"),

  /**
   * Fetch the currently-authenticated user's profile.
   */
  getMe: () => api.get<User>("/auth/me"),

  /**
   * Send a password-reset email.
   */
  forgotPassword: (email: string) =>
    api.post<void>("/auth/forgot-password", { email }),

  /**
   * Complete the password-reset flow.
   */
  resetPassword: (token: string, password: string) =>
    api.post<void>("/auth/reset-password", { token, password }),

  /**
   * Verify an email address using a one-time token.
   */
  verifyEmail: (token: string) =>
    api.post<void>("/auth/verify-email", { token }),

  /**
   * Exchange a refresh token for a new access token.
   */
  refreshToken: (refreshToken: string) =>
    api.post<Pick<AuthResponse, "token" | "refreshToken">>("/auth/refresh", {
      refreshToken,
    }),
};
