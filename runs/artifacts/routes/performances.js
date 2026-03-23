const express = require("express");
const router = express.Router();
const performanceController = require("../controllers/performanceController");
const {
  validatePerformance,
  validatePerformanceUpdate,
} = require("../middleware/validators/performanceValidator");
const { validateUUID } = require("../middleware/validators/commonValidator");
const paginate = require("../middleware/paginate");

/**
 * @route   GET /api/v1/performances
 * @desc    Retrieve all performance records with optional filters
 * @access  Public
 * @query   ?athleteId=uuid&metric=speed&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20
 */
router.get("/", paginate, performanceController.getAllPerformances);

/**
 * @route   GET /api/v1/performances/summary
 * @desc    Get aggregated performance summary stats
 * @access  Public
 * @query   ?athleteId=uuid&groupBy=month&metric=speed
 */
router.get("/summary", performanceController.getPerformanceSummary);

/**
 * @route   GET /api/v1/performances/:id
 * @desc    Retrieve a single performance record by ID
 * @access  Public
 */
router.get("/:id", validateUUID("id"), performanceController.getPerformanceById);

/**
 * @route   POST /api/v1/performances
 * @desc    Log a new performance record
 * @access  Public
 */
router.post("/", validatePerformance, performanceController.createPerformance);

/**
 * @route   PUT /api/v1/performances/:id
 * @desc    Fully replace a performance record
 * @access  Public
 */
router.put(
  "/:id",
  validateUUID("id"),
  validatePerformance,
  performanceController.updatePerformance
);

/**
 * @route   PATCH /api/v1/performances/:id
 * @desc    Partially update a performance record
 * @access  Public
 */
router.patch(
  "/:id",
  validateUUID("id"),
  validatePerformanceUpdate,
  performanceController.patchPerformance
);

/**
 * @route   DELETE /api/v1/performances/:id
 * @desc    Delete a performance record
 * @access  Public
 */
router.delete("/:id", validateUUID("id"), performanceController.deletePerformance);

module.exports = router;
