/**
 * authMiddleware.js  (server-side Express middleware)
 *
 * Exports:
 *   authenticate   – verifies the JWT and attaches req.user
 *   authorize(...) – factory that creates a role-check middleware
 *   requirePermission(...) – factory that checks specific RBAC permissions
 *   optionalAuth   – attaches req.user if token present, but never blocks
 *
 * Usage:
 *   router.get('/admin/users',  authenticate, authorize('admin'), handler)
 *   router.get('/analytics',    authenticate, requirePermission('view:all_analytics'), handler)
 *   router.get('/public-feed',  optionalAuth, handler)
 */

import { verifyAccessToken, extractBearerToken } from "./authUtils.js";
import { roleHasPermission, roleHasAnyPermission, isValidRole } from "./rbac.js";

// ─── Authenticate ─────────────────────────────────────────────────────────────

/**
 * Verifies the JWT in the Authorization header.
 * On success: attaches decoded payload to req.user and calls next().
 * On failure: responds with 401.
 */
export function authenticate(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. No token provided.",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      error: isExpired
        ? "Token has expired. Please refresh your session."
        : "Invalid token.",
      code: isExpired ? "TOKEN_EXPIRED" : "TOKEN_INVALID",
    });
  }
}

// ─── Authorize (Role-based) ───────────────────────────────────────────────────

/**
 * Middleware factory that restricts access to one or more roles.
 * Must be used AFTER `authenticate`.
 *
 * @param {...string} allowedRoles - One or more ROLES.* values
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.delete('/users/:id', authenticate, authorize('admin'), deleteUserHandler)
 *   router.get('/teams',        authenticate, authorize('admin', 'coach'), listTeamsHandler)
 */
export function authorize(...allowedRoles) {
  // Validate roles at startup time so misconfigurations are caught early.
  if (!isValidRole(allowedRoles)) {
    throw new Error(
      `authorize() received invalid role(s): ${allowedRoles.join(", ")}`
    );
  }

  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role(s): ${allowedRoles.join(", ")}.`,
        code: "INSUFFICIENT_ROLE",
      });
    }

    next();
  };
}

// ─── Require Permission ───────────────────────────────────────────────────────

/**
 * Middleware factory that restricts access based on RBAC permissions.
 * Accepts `mode`:
 *   "all"  – user must have EVERY listed permission (default)
 *   "any"  – user must have AT LEAST ONE listed permission
 *
 * @param {string|string[]} permissions
 * @param {{ mode?: 'all' | 'any' }} [options]
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.get('/analytics/export',
 *     authenticate,
 *     requirePermission('export:analytics'),
 *     exportHandler
 *   )
 *   router.get('/workouts',
 *     authenticate,
 *     requirePermission(['view:own_workouts','view:all_workouts'], { mode: 'any' }),
 *     listWorkoutsHandler
 *   )
 */
export function requirePermission(permissions, { mode = "all" } = {}) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];

  return function permissionGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const { role } = req.user;
    const allowed =
      mode === "any"
        ? roleHasAnyPermission(role, perms)
        : perms.every((p) => roleHasPermission(role, p));

    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to perform this action.",
        code: "INSUFFICIENT_PERMISSION",
        required: perms,
        mode,
      });
    }

    next();
  };
}

// ─── Optional Auth ────────────────────────────────────────────────────────────

/**
 * Attempts to decode the JWT if present.
 * Never blocks the request — useful for endpoints that serve both
 * authenticated and anonymous users with different response shapes.
 */
export function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  } catch {
    req.user = null;
  }

  next();
}

// ─── Self-or-Admin Guard ──────────────────────────────────────────────────────

/**
 * Middleware that allows access if the authenticated user is an admin OR
 * if the resource belongs to them (req.params.userId === req.user.id).
 *
 * @example
 *   router.get('/users/:userId/profile', authenticate, selfOrAdmin, getProfileHandler)
 */
export function selfOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  const isAdmin = req.user.role === "admin";
  const isSelf = req.params.userId && req.params.userId === req.user.id;

  if (!isAdmin && !isSelf) {
    return res.status(403).json({
      success: false,
      error: "Access denied. You may only access your own resources.",
      code: "NOT_SELF_OR_ADMIN",
    });
  }

  next();
}
