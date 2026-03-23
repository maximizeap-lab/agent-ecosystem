const express = require("express");
const router = express.Router();
const athleteController = require("../controllers/athleteController");
const { validateAthlete, validateAthleteUpdate } = require("../middleware/validators/athleteValidator");
const { validateUUID } = require("../middleware/validators/commonValidator");
const paginate = require("../middleware/paginate");

/**
 * @route   GET /api/v1/athletes
 * @desc    Retrieve all athletes with optional filters and pagination
 * @access  Public
 * @query   ?sport=soccer&position=midfielder&status=active&page=1&limit=20&sort=lastName&order=asc
 */
router.get("/", paginate, athleteController.getAllAthletes);

/**
 * @route   GET /api/v1/athletes/:id
 * @desc    Retrieve a single athlete by ID
 * @access  Public
 */
router.get("/:id", validateUUID("id"), athleteController.getAthleteById);

/**
 * @route   GET /api/v1/athletes/:id/performances
 * @desc    Retrieve all performance records for a specific athlete
 * @access  Public
 * @query   ?startDate=2024-01-01&endDate=2024-12-31&metric=speed
 */
router.get("/:id/performances", validateUUID("id"), paginate, athleteController.getAthletePerformances);

/**
 * @route   GET /api/v1/athletes/:id/sessions
 * @desc    Retrieve all training sessions for a specific athlete
 * @access  Public
 */
router.get("/:id/sessions", validateUUID("id"), paginate, athleteController.getAthleteSessions);

/**
 * @route   POST /api/v1/athletes
 * @desc    Create a new athlete profile
 * @access  Public
 */
router.post("/", validateAthlete, athleteController.createAthlete);

/**
 * @route   PUT /api/v1/athletes/:id
 * @desc    Fully replace an athlete record
 * @access  Public
 */
router.put("/:id", validateUUID("id"), validateAthlete, athleteController.updateAthlete);

/**
 * @route   PATCH /api/v1/athletes/:id
 * @desc    Partially update an athlete record
 * @access  Public
 */
router.patch("/:id", validateUUID("id"), validateAthleteUpdate, athleteController.patchAthlete);

/**
 * @route   DELETE /api/v1/athletes/:id
 * @desc    Soft-delete an athlete record
 * @access  Public
 */
router.delete("/:id", validateUUID("id"), athleteController.deleteAthlete);

module.exports = router;
