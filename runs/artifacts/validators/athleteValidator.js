/**
 * athleteValidator.js
 * -------------------
 * Joi schemas that validate incoming request bodies and query strings
 * for all athlete-related endpoints.
 */

import Joi from "joi";

const SPORTS = [
  "Track & Field", "Swimming", "Cycling", "Football", "Basketball",
  "Tennis", "Rugby", "Gymnastics", "Rowing", "Soccer", "Volleyball",
  "Weightlifting", "Wrestling", "Boxing", "Triathlon", "Other",
];

const STATUSES = ["active", "injured", "retired", "suspended"];

// ─── Shared field definitions ─────────────────────────────────────────────────
const firstName    = Joi.string().trim().min(1).max(50);
const lastName     = Joi.string().trim().min(1).max(50);
const email        = Joi.string().trim().email();
const dateOfBirth  = Joi.string().isoDate();
const sport        = Joi.string().valid(...SPORTS);
const position     = Joi.string().trim().max(50);
const team         = Joi.string().trim().max(100);
const nationality  = Joi.string().trim().min(2).max(60);
const height_cm    = Joi.number().integer().min(100).max(250);
const weight_kg    = Joi.number().min(30).max(250);
const status       = Joi.string().valid(...STATUSES);

// ─── Create Athlete ──────────────────────────────────────────────────────────
export const createAthleteSchema = Joi.object({
  firstName:   firstName.required(),
  lastName:    lastName.required(),
  email:       email.required(),
  dateOfBirth: dateOfBirth.required(),
  sport:       sport.required(),
  position:    position.optional(),
  team:        team.optional(),
  nationality: nationality.optional(),
  height_cm:   height_cm.optional(),
  weight_kg:   weight_kg.optional(),
  status:      status.optional().default("active"),
});

// ─── Update Athlete (all fields optional for PATCH) ──────────────────────────
export const updateAthleteSchema = Joi.object({
  firstName:   firstName.optional(),
  lastName:    lastName.optional(),
  email:       email.optional(),
  dateOfBirth: dateOfBirth.optional(),
  sport:       sport.optional(),
  position:    position.optional(),
  team:        team.optional(),
  nationality: nationality.optional(),
  height_cm:   height_cm.optional(),
  weight_kg:   weight_kg.optional(),
  status:      status.optional(),
}).min(1);  // at least one field required for a PATCH

// ─── Query string filter schema ───────────────────────────────────────────────
export const athleteQuerySchema = Joi.object({
  sport:  sport.optional(),
  team:   Joi.string().trim().optional(),
  status: status.optional(),
  search: Joi.string().trim().max(100).optional(),
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
});
