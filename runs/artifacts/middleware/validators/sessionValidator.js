const { body, validationResult } = require("express-validator");

const VALID_SESSION_TYPES = [
  "strength", "cardio", "agility", "recovery", "technical",
  "tactical", "endurance", "flexibility", "scrimmage", "assessment", "other",
];

const VALID_SESSION_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];

// ── Full (POST / PUT) validation ───────────────────────────────────────────────
exports.validateSession = [
  body("title")
    .trim()
    .notEmpty().withMessage("title is required")
    .isLength({ max: 255 }).withMessage("title must be 255 characters or fewer"),

  body("type")
    .notEmpty().withMessage("type is required")
    .isIn(VALID_SESSION_TYPES)
    .withMessage(`type must be one of: ${VALID_SESSION_TYPES.join(", ")}`),

  body("scheduledAt")
    .notEmpty().withMessage("scheduledAt is required")
    .isISO8601().withMessage("scheduledAt must be a valid ISO 8601 datetime"),

  body("durationMinutes")
    .notEmpty().withMessage("durationMinutes is required")
    .isInt({ min: 1, max: 480 }).withMessage("durationMinutes must be between 1 and 480"),

  body("coachId")
    .optional()
    .isUUID().withMessage("coachId must be a valid UUID"),

  body("location")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("location must be 255 characters or fewer"),

  body("maxCapacity")
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage("maxCapacity must be between 1 and 500"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("notes must be 2000 characters or fewer"),

  body("goals")
    .optional()
    .isArray().withMessage("goals must be an array")
    .custom((goals) => {
      if (goals.some((g) => typeof g !== "string" || g.length > 255)) {
        throw new Error("Each goal must be a string with 255 characters or fewer");
      }
      return true;
    }),

  handleValidationErrors,
];

// ── Partial (PATCH) validation ─────────────────────────────────────────────────
exports.validateSessionUpdate = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage("title must be 255 characters or fewer"),

  body("type")
    .optional()
    .isIn(VALID_SESSION_TYPES)
    .withMessage(`type must be one of: ${VALID_SESSION_TYPES.join(", ")}`),

  body("scheduledAt")
    .optional()
    .isISO8601().withMessage("scheduledAt must be a valid ISO 8601 datetime"),

  body("durationMinutes")
    .optional()
    .isInt({ min: 1, max: 480 }).withMessage("durationMinutes must be between 1 and 480"),

  body("status")
    .optional()
    .isIn(VALID_SESSION_STATUSES)
    .withMessage(`status must be one of: ${VALID_SESSION_STATUSES.join(", ")}`),

  body("maxCapacity")
    .optional()
    .isInt({ min: 1, max: 500 }).withMessage("maxCapacity must be between 1 and 500"),

  body("goals")
    .optional()
    .isArray().withMessage("goals must be an array"),

  handleValidationErrors,
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}
