/**
 * authUtils.js  (server-side)
 * JWT signing, verification, and refresh-token utilities.
 * Uses the `jsonwebtoken` package.
 *
 * Environment variables expected:
 *   JWT_ACCESS_SECRET   – secret for access tokens
 *   JWT_REFRESH_SECRET  – secret for refresh tokens
 *   ACCESS_TOKEN_TTL    – e.g. "15m"  (default: 15 minutes)
 *   REFRESH_TOKEN_TTL   – e.g. "7d"   (default: 7 days)
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables."
  );
}

// ─── Token Payload Shape ──────────────────────────────────────────────────────
/**
 * @typedef {Object} TokenPayload
 * @property {string} sub   - User ID
 * @property {string} email
 * @property {string} role  - One of ROLES.*
 * @property {string} jti   - Unique token ID (for revocation)
 */

// ─── Access Token ─────────────────────────────────────────────────────────────

/**
 * Signs and returns a short-lived access token.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string}
 */
export function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
    algorithm: "HS256",
  });
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {TokenPayload}
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: ["HS256"] });
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

/**
 * Signs and returns a long-lived refresh token.
 * @param {{ id: string }} user
 * @returns {string}
 */
export function signRefreshToken(user) {
  const payload = {
    sub: user.id,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    algorithm: "HS256",
  });
}

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ sub: string, jti: string }}
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: ["HS256"] });
}

// ─── Cookie Helpers ───────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Attaches an HttpOnly refresh-token cookie to the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setRefreshTokenCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: "/api/auth", // restrict to auth endpoints only
  });
}

/**
 * Clears the refresh-token cookie.
 * @param {import('express').Response} res
 */
export function clearRefreshTokenCookie(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

// ─── Token Extraction Helper ─────────────────────────────────────────────────

/**
 * Extracts a Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function extractBearerToken(req) {
  const header = req.headers?.authorization ?? "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

// ─── Token Metadata ──────────────────────────────────────────────────────────

/**
 * Decodes a JWT without verifying the signature.
 * Useful for reading expiry in non-critical client-side code.
 * @param {string} token
 * @returns {object|null}
 */
export function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

/**
 * Returns true if the token's exp claim is in the past.
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

/**
 * Returns the number of milliseconds until the token expires.
 * Returns 0 if already expired.
 * @param {string} token
 * @returns {number}
 */
export function msUntilExpiry(token) {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return 0;
  return Math.max(0, decoded.exp * 1000 - Date.now());
}
