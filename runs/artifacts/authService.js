/**
 * authService.js  (client-side)
 * Handles all HTTP calls related to authentication.
 * Relies on axios with an interceptor that auto-refreshes expired access tokens.
 */

import axios from "axios";
import { isTokenExpired, msUntilExpiry } from "./authUtils.js";

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true, // send HttpOnly refresh-token cookie automatically
  timeout: 10_000,
});

// In-memory store for the access token (never localStorage for security).
let _accessToken = null;
let _refreshPromise = null; // deduplicate concurrent refresh calls

// ─── Token Accessors ──────────────────────────────────────────────────────────

export function getAccessToken() {
  return _accessToken;
}

export function setAccessToken(token) {
  _accessToken = token;
}

export function clearAccessToken() {
  _accessToken = null;
}

// ─── Request Interceptor – attach Bearer token ────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    // Skip token logic for auth endpoints to avoid loops
    const isAuthEndpoint =
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/logout") ||
      config.url?.includes("/auth/refresh");

    if (!isAuthEndpoint && _accessToken) {
      // Proactively refresh if token expires within 60 seconds
      if (msUntilExpiry(_accessToken) < 60_000) {
        await _doRefresh();
      }
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor – handle 401 ───────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await _doRefresh();
        originalRequest.headers.Authorization = `Bearer ${_accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed – broadcast logout event for the auth context to catch
        window.dispatchEvent(new Event("auth:logout"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Internal Refresh Helper ─────────────────────────────────────────────────

async function _doRefresh() {
  // Deduplicate: if a refresh is already in flight, reuse the same promise
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = api
    .post("/auth/refresh")
    .then(({ data }) => {
      _accessToken = data.accessToken;
    })
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

/**
 * Log in with email + password.
 * Stores the returned access token in memory.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: object, accessToken: string }>}
 */
export async function login({ email, password }) {
  const { data } = await api.post("/auth/login", { email, password });
  _accessToken = data.accessToken;
  return data; // { user, accessToken }
}

/**
 * Log the current user out on both client and server.
 * Clears the HttpOnly cookie server-side and the in-memory token here.
 */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAccessToken();
  }
}

/**
 * Silently refreshes the access token using the HttpOnly refresh-token cookie.
 * Called on app boot to restore session without requiring a re-login.
 *
 * @returns {Promise<{ user: object, accessToken: string } | null>}
 */
export async function refreshSession() {
  try {
    const { data } = await api.post("/auth/refresh");
    _accessToken = data.accessToken;
    return data; // { user, accessToken }
  } catch {
    return null; // No valid session — user needs to log in
  }
}

/**
 * Fetches the currently authenticated user's profile.
 * @returns {Promise<object>}
 */
export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data.user;
}

/**
 * Sends a password-reset email.
 * @param {string} email
 */
export async function requestPasswordReset(email) {
  const { data } = await api.post("/auth/password-reset/request", { email });
  return data;
}

/**
 * Resets the password using the token from the reset email.
 * @param {{ token: string, newPassword: string }} payload
 */
export async function resetPassword({ token, newPassword }) {
  const { data } = await api.post("/auth/password-reset/confirm", {
    token,
    newPassword,
  });
  return data;
}

/**
 * Changes the password for the currently authenticated user.
 * @param {{ currentPassword: string, newPassword: string }} payload
 */
export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.patch("/auth/password", {
    currentPassword,
    newPassword,
  });
  return data;
}

export default api;
