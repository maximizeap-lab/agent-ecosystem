/**
 * performanceValidator.js
 * -----------------------
 * Joi schemas for performance session endpoints.
 */

import Joi from "joi";

const SESSION_TYPES = ["training", "race", "time_trial", "recovery", "scrimmage", "assessment"];

// ─── Shared field definitions ─────────────────────────────────────────────────
const athleteId   = Joi.string().trim();
const sessionDate = Joi.string().isoDate();
const sessionType = Joi.string().valid(...SESSION_TYPES);
const event       = Joi.string().trim().max(100);
const duration    = Joi.number().min(1).max(1440);       // minutes
const distance    = Joi.number().min(0).max(1000);        // km
const metrics     = Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.number(), Joi.string())).optional();
const rpe         = Joi.number().integer().min(1).max(10);
const notes       = Joi.string().trim().max(1000).allow("").optional();

// ─── Create Performance Record ────────────────────────────────────────────────
export const createPerformanceSchema = Joi.object({
  athleteId:    athleteId.required(),
  sessionDate:  sessionDate.required(),
  sessionType:  sessionType.required(),
  event:        event.required(),
  duration_min: duration.optional(),
  distance_km:  distance.optional(),
  metrics:      metrics,
  rpe:          rpe.optional(),
  notes:        notes,
});

// ─── Update Performance Record (PATCH — all fields optional) ──────────────────
export const updatePerformanceSchema = Joi.object({
  sessionDate:  sessionDate.optional(),
  sessionType:  sessionType.optional(),
  event:        event.optional(),
  duration_min: duration.optional(),
  distance_km:  distance.optional(),
  metrics:      metrics,
  rpe:          rpe.optional(),
  notes:        notes,
}).min(1);

// ─── Query String Filters ─────────────────────────────────────────────────────
export const performanceQuerySchema = Joi.object({
  athleteId:   athleteId.optional(),
  sessionType: sessionType.optional(),
  event:       Joi.string().trim().max(100).optional(),
  startDate:   Joi.string().isoDate().optional(),
  endDate:     Joi.string().isoDate().optional(),
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(100).default(20),
}).and("startDate", "endDate").optional();
