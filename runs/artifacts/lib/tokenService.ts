// ─────────────────────────────────────────────────────────────
//  Token Service
//  Handles JWT encode/decode, secure storage, and rotation.
//  Works in both browser (localStorage / cookie) and SSR.
// ─────────────────────────────────────────────────────────────

import { JwtPayload, TokenPair } from "../types/auth.types";

// ── Constants ────────────────────────────────────────────────

const ACCESS_TOKEN_KEY  = "dashboard_access_token";
const REFRESH_TOKEN_KEY = "dashboard_refresh_token";

// ── Decode (client-side — no signature verification) ─────────
// Signature verification must be done server-side / in middleware.

function base64UrlDecode(str: string): string {
  // Pad to multiple of 4
  const padding = 4 - (str.length % 4);
  const padded = str + (padding !== 4 ? "=".repeat(padding) : "");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return atob(base64);
  } catch {
    throw new Error("Invalid base64url string");
  }
}

/**
 * Decode a JWT without verifying its signature.
 * Use ONLY for reading UI-relevant claims on the client.
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true when the token has not yet expired.
 * Adds a 30-second clock-skew buffer.
 */
export function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds + 30; // 30s buffer
}

/**
 * Seconds remaining until the token expires (may be negative if expired).
 */
export function tokenTtlSeconds(token: string): number {
  const payload = decodeToken(token);
  if (!payload) return -1;
  return payload.exp - Math.floor(Date.now() / 1000);
}

// ── Storage helpers ──────────────────────────────────────────

type StorageBackend = "localStorage" | "sessionStorage" | "memory";

class TokenStore {
  private backend: StorageBackend;
  private memoryStore: Map<string, string> = new Map();

  constructor() {
    // Prefer localStorage; fall back to memory in SSR / private mode
    this.backend = this.detectBackend();
  }

  private detectBackend(): StorageBackend {
    if (typeof window === "undefined") return "memory";
    try {
      window.localStorage.setItem("__probe__", "1");
      window.localStorage.removeItem("__probe__");
      return "localStorage";
    } catch {
      return "memory";
    }
  }

  get(key: string): string | null {
    if (this.backend === "localStorage") {
      return window.localStorage.getItem(key);
    }
    if (this.backend === "sessionStorage") {
      return window.sessionStorage.getItem(key);
    }
    return this.memoryStore.get(key) ?? null;
  }

  set(key: string, value: string): void {
    if (this.backend === "localStorage") {
      window.localStorage.setItem(key, value);
    } else if (this.backend === "sessionStorage") {
      window.sessionStorage.setItem(key, value);
    } else {
      this.memoryStore.set(key, value);
    }
  }

  remove(key: string): void {
    if (this.backend === "localStorage") {
      window.localStorage.removeItem(key);
    } else if (this.backend === "sessionStorage") {
      window.sessionStorage.removeItem(key);
    } else {
      this.memoryStore.delete(key);
    }
  }

  useSession(): void {
    this.backend = "sessionStorage";
  }
}

export const tokenStore = new TokenStore();

// ── Public API ───────────────────────────────────────────────

export function saveTokens(pair: TokenPair, rememberMe = true): void {
  if (!rememberMe) tokenStore.useSession();
  tokenStore.set(ACCESS_TOKEN_KEY, pair.accessToken);
  tokenStore.set(REFRESH_TOKEN_KEY, pair.refreshToken);
}

export function getAccessToken(): string | null {
  return tokenStore.get(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return tokenStore.get(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  tokenStore.remove(ACCESS_TOKEN_KEY);
  tokenStore.remove(REFRESH_TOKEN_KEY);
}

export function getValidAccessToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  return isTokenValid(token) ? token : null;
}

// ── Authorization header helper ───────────────────────────────

export function authorizationHeader(): Record<string, string> {
  const token = getValidAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
