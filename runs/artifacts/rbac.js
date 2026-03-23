/**
 * rbac.js
 * Central source-of-truth for roles, permissions, and helper utilities.
 * Import this file on both the client and server so the permission model
 * is never duplicated.
 */

// ─── Role Definitions ────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  ADMIN: "admin",
  COACH: "coach",
  ATHLETE: "athlete",
});

// ─── Permission Definitions ───────────────────────────────────────────────────
// Every capability in the system is declared here as a string constant.

export const PERMISSIONS = Object.freeze({
  // User management
  VIEW_ALL_USERS: "view:all_users",
  CREATE_USER: "create:user",
  EDIT_USER: "edit:user",
  DELETE_USER: "delete:user",
  ASSIGN_ROLES: "assign:roles",

  // Team management
  VIEW_TEAM: "view:team",
  CREATE_TEAM: "create:team",
  EDIT_TEAM: "edit:team",
  DELETE_TEAM: "delete:team",
  MANAGE_ROSTER: "manage:roster",

  // Athlete profiles
  VIEW_OWN_PROFILE: "view:own_profile",
  VIEW_ANY_PROFILE: "view:any_profile",
  EDIT_OWN_PROFILE: "edit:own_profile",
  EDIT_ANY_PROFILE: "edit:any_profile",

  // Training / workouts
  VIEW_OWN_WORKOUTS: "view:own_workouts",
  VIEW_ALL_WORKOUTS: "view:all_workouts",
  CREATE_WORKOUT: "create:workout",
  EDIT_WORKOUT: "edit:workout",
  DELETE_WORKOUT: "delete:workout",
  ASSIGN_WORKOUT: "assign:workout",

  // Performance analytics
  VIEW_OWN_ANALYTICS: "view:own_analytics",
  VIEW_ALL_ANALYTICS: "view:all_analytics",
  EXPORT_ANALYTICS: "export:analytics",

  // Scheduling
  VIEW_SCHEDULE: "view:schedule",
  CREATE_EVENT: "create:event",
  EDIT_EVENT: "edit:event",
  DELETE_EVENT: "delete:event",

  // Messaging
  SEND_MESSAGE: "send:message",
  VIEW_ALL_MESSAGES: "view:all_messages",

  // System settings
  MANAGE_SETTINGS: "manage:settings",
  VIEW_AUDIT_LOGS: "view:audit_logs",
});

// ─── Role → Permission Map ────────────────────────────────────────────────────
// Each role is granted a precise set of permissions. Roles do NOT inherit
// from each other to keep the model explicit and auditable.

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_ALL_USERS,
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.EDIT_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.ASSIGN_ROLES,

    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.CREATE_TEAM,
    PERMISSIONS.EDIT_TEAM,
    PERMISSIONS.DELETE_TEAM,
    PERMISSIONS.MANAGE_ROSTER,

    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_ANY_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.EDIT_ANY_PROFILE,

    PERMISSIONS.VIEW_OWN_WORKOUTS,
    PERMISSIONS.VIEW_ALL_WORKOUTS,
    PERMISSIONS.CREATE_WORKOUT,
    PERMISSIONS.EDIT_WORKOUT,
    PERMISSIONS.DELETE_WORKOUT,
    PERMISSIONS.ASSIGN_WORKOUT,

    PERMISSIONS.VIEW_OWN_ANALYTICS,
    PERMISSIONS.VIEW_ALL_ANALYTICS,
    PERMISSIONS.EXPORT_ANALYTICS,

    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,

    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.VIEW_ALL_MESSAGES,

    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],

  [ROLES.COACH]: [
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.MANAGE_ROSTER,

    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.VIEW_ANY_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,

    PERMISSIONS.VIEW_OWN_WORKOUTS,
    PERMISSIONS.VIEW_ALL_WORKOUTS,
    PERMISSIONS.CREATE_WORKOUT,
    PERMISSIONS.EDIT_WORKOUT,
    PERMISSIONS.DELETE_WORKOUT,
    PERMISSIONS.ASSIGN_WORKOUT,

    PERMISSIONS.VIEW_OWN_ANALYTICS,
    PERMISSIONS.VIEW_ALL_ANALYTICS,
    PERMISSIONS.EXPORT_ANALYTICS,

    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_EVENT,
    PERMISSIONS.DELETE_EVENT,

    PERMISSIONS.SEND_MESSAGE,
  ],

  [ROLES.ATHLETE]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,

    PERMISSIONS.VIEW_OWN_WORKOUTS,

    PERMISSIONS.VIEW_OWN_ANALYTICS,

    PERMISSIONS.VIEW_SCHEDULE,

    PERMISSIONS.SEND_MESSAGE,
  ],
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Returns all permissions granted to a given role.
 * @param {string} role - One of ROLES.*
 * @returns {string[]}
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Checks whether a role has a specific permission.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function roleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

/**
 * Checks whether a role has ALL of the supplied permissions.
 * @param {string} role
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function roleHasAllPermissions(role, permissions) {
  const granted = getPermissionsForRole(role);
  return permissions.every((p) => granted.includes(p));
}

/**
 * Checks whether a role has AT LEAST ONE of the supplied permissions.
 * @param {string} role
 * @param {string[]} permissions
 * @returns {boolean}
 */
export function roleHasAnyPermission(role, permissions) {
  const granted = getPermissionsForRole(role);
  return permissions.some((p) => granted.includes(p));
}

/**
 * Checks whether a user object (containing a `role` field) has the permission.
 * @param {{ role: string }} user
 * @param {string} permission
 * @returns {boolean}
 */
export function userCan(user, permission) {
  if (!user?.role) return false;
  return roleHasPermission(user.role, permission);
}

/**
 * Returns true if ALL provided roles are valid ROLES values.
 * Useful for validating incoming API payloads.
 * @param {string|string[]} roles
 * @returns {boolean}
 */
export function isValidRole(roles) {
  const arr = Array.isArray(roles) ? roles : [roles];
  const valid = Object.values(ROLES);
  return arr.every((r) => valid.includes(r));
}
