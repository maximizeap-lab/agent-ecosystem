const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const {
  validateSession,
  validateSessionUpdate,
} = require("../middleware/validators/sessionValidator");
const { validateUUID } = require("../middleware/validators/commonValidator");
const paginate = require("../middleware/paginate");

/**
 * @route   GET /api/v1/sessions
 * @desc    Retrieve all training sessions with optional filters
 * @access  Public
 * @query   ?athleteId=uuid&type=strength&status=completed&coachId=uuid&page=1&limit=20
 */
router.get("/", paginate, sessionController.getAllSessions);

/**
 * @route   GET /api/v1/sessions/:id
 * @desc    Retrieve a single training session by ID
 * @access  Public
 */
router.get("/:id", validateUUID("id"), sessionController.getSessionById);

/**
 * @route   GET /api/v1/sessions/:id/athletes
 * @desc    List all athletes enrolled in a session
 * @access  Public
 */
router.get("/:id/athletes", validateUUID("id"), sessionController.getSessionAthletes);

/**
 * @route   POST /api/v1/sessions
 * @desc    Create a new training session
 * @access  Public
 */
router.post("/", validateSession, sessionController.createSession);

/**
 * @route   POST /api/v1/sessions/:id/athletes
 * @desc    Enroll athlete(s) into a training session
 * @access  Public
 * @body    { athleteIds: [uuid, ...] }
 */
router.post("/:id/athletes", validateUUID("id"), sessionController.enrollAthletes);

/**
 * @route   PUT /api/v1/sessions/:id
 * @desc    Fully replace a training session record
 * @access  Public
 */
router.put("/:id", validateUUID("id"), validateSession, sessionController.updateSession);

/**
 * @route   PATCH /api/v1/sessions/:id
 * @desc    Partially update a training session
 * @access  Public
 */
router.patch(
  "/:id",
  validateUUID("id"),
  validateSessionUpdate,
  sessionController.patchSession
);

/**
 * @route   DELETE /api/v1/sessions/:id/athletes/:athleteId
 * @desc    Remove an athlete from a training session
 * @access  Public
 */
router.delete(
  "/:id/athletes/:athleteId",
  validateUUID("id"),
  validateUUID("athleteId"),
  sessionController.removeAthleteFromSession
);

/**
 * @route   DELETE /api/v1/sessions/:id
 * @desc    Delete a training session
 * @access  Public
 */
router.delete("/:id", validateUUID("id"), sessionController.deleteSession);

module.exports = router;
