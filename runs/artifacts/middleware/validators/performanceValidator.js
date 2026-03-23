const { body, validationResult } = require("express-validator");

const VALID_METRICS = [
  "speed", "endurance", "strength", "agility", "accuracy",
  "reaction_time", "heart_rate", "vo2_max", "distance",
  "jump_height", "sprint_time", "power_output", "flexibility",
  "recovery_time", "score", "custom",
];

// ── Full (POST / PUT) validation ───────────────────────────────────────────────
exports.validatePerformance = [
  body("athleteId")
    .notEmpty().withMessage("athleteId is required")
    .isUUID().withMessage("athleteId must be a valid UUID"),

  body("metric")
    .notEmpty().withMessage("metric is required")
    .isIn(VALID_METRICS).withMessage(`metric must be one of: ${VALID_METRICS.join(", ")}`),

  body("value")
    .notEmpty().withMessage("value is required")
    .isFloat().withMessage("value must be a numeric value"),

  body("unit")
    .notEmpty().withMessage("unit is required")
    .trim()
    .isLength({ max: 50 }).withMessage("unit must be 50 characters or fewer"),

  body("sessionId")
    .optional()
    .isUUID().withMessage("sessionId must be a valid UUID"),

  body("recordedAt")
    .optional()
    .isISO8601().withMessage("recordedAt must be a valid ISO 8601 datetime")
    .custom((value) => {
      if (new Date(value) > new Date()) throw new Error("recordedAt cannot be in the future");
      return true;
    }),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("notes must be 2000 characters or fewer"),

  body("tags")
    .optional()
    .isArray().withMessage("tags must be an array")
    .custom((tags) => {
      if (tags.some((t) => typeof t !== "string" || t.length > 50)) {
        throw new Error("Each tag must be a string with 50 characters or fewer");
      }
      return true;
    }),

  handleValidationErrors,
];

// ── Partial (PATCH) validation ─────────────────────────────────────────────────
exports.validatePerformanceUpdate = [
  body("metric")
    .optional()
    .isIn(VALID_METRICS).withMessage(`metric must be one of: ${VALID_METRICS.join(", ")}`),

  body("value")
    .optional()
    .isFloat().withMessage("value must be a numeric value"),

  body("unit")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("unit must be 50 characters or fewer"),

  body("sessionId")
    .optional()
    .isUUID().withMessage("sessionId must be a valid UUID"),

  body("recordedAt")
    .optional()
    .isISO8601().withMessage("recordedAt must be a valid ISO 8601 datetime")
    .custom((value) => {
      if (new Date(value) > new Date()) throw new Error("recordedAt cannot be in the future");
      return true;
    }),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("notes must be 2000 characters or fewer"),

  body("tags")
    .optional()
    .isArray().withMessage("tags must be an array"),

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
