/**
 * routes/performance.js
 * ---------------------
 * Performance data endpoints.
 *
 *  GET    /api/v1/performance                       List & filter sessions
 *  POST   /api/v1/performance                       Log a new session
 *  GET    /api/v1/performance/athlete/:athleteId    All sessions for an athlete
 *  GET    /api/v1/performance/:id                   Get session by ID
 *  PATCH  /api/v1/performance/:id                   Partial update
 *  DELETE /api/v1/performance/:id                   Delete a session
 */

import { Router } from "express";
import {
  getAllPerformance,
  createPerformance,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  getPerformanceByAthlete,
} from "../controllers/performanceController.js";
import { validate } from "../middleware/validate.js";
import {
  createPerformanceSchema,
  updatePerformanceSchema,
  performanceQuerySchema,
} from "../validators/performanceValidator.js";

export const performanceRoutes = Router();

// Athlete-scoped listing (must be before /:id)
performanceRoutes.get("/athlete/:athleteId", getPerformanceByAthlete);

// List / Create
performanceRoutes
  .route("/")
  .get(validate(performanceQuerySchema, "query"), getAllPerformance)
  .post(validate(createPerformanceSchema), createPerformance);

// Single record
performanceRoutes
  .route("/:id")
  .get(getPerformanceById)
  .patch(validate(updatePerformanceSchema), updatePerformance)
  .delete(deletePerformance);
