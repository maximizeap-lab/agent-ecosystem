const { body, validationResult } = require("express-validator");

const VALID_SPORTS = [
  "soccer", "basketball", "tennis", "swimming", "athletics",
  "cycling", "rugby", "baseball", "volleyball", "gymnastics",
  "wrestling", "boxing", "golf", "hockey", "cricket", "other",
];

const VALID_STATUSES = ["active", "injured", "suspended", "inactive", "retired"];

// ── Full (PUT / POST) validation ───────────────────────────────────────────────
exports.validateAthlete = [
  body("firstName")
    .trim()
    .notEmpty().withMessage("firstName is required")
    .isLength({ max: 100 }).withMessage("firstName must be 100 characters or fewer"),

  body("lastName")
    .trim()
    .notEmpty().withMessage("lastName is required")
    .isLength({ max: 100 }).withMessage("lastName must be 100 characters or fewer"),

  body("dateOfBirth")
    .notEmpty().withMessage("dateOfBirth is required")
    .isISO8601().withMessage("dateOfBirth must be a valid ISO 8601 date (YYYY-MM-DD)")
    .custom((value) => {
      const dob = new Date(value);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 5 || age > 100) throw new Error("Athlete age must be between 5 and 100");
      return true;
    }),

  body("sport")
    .notEmpty().withMessage("sport is required")
    .isIn(VALID_SPORTS).withMessage(`sport must be one of: ${VALID_SPORTS.join(", ")}`),

  body("email")
    .notEmpty().withMessage("email is required")
    .isEmail().withMessage("email must be a valid email address")
    .normalizeEmail(),

  body("position")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("position must be 100 characters or fewer"),

  body("teamId")
    .optional()
    .isUUID().withMessage("teamId must be a valid UUID"),

  body("phone")
    .optional()
    .isMobilePhone("any").withMessage("phone must be a valid phone number"),

  body("height")
    .optional()
    .isFloat({ min: 50, max: 300 }).withMessage("height must be between 50 and 300 (cm)"),

  body("weight")
    .optional()
    .isFloat({ min: 20, max: 500 }).withMessage("weight must be between 20 and 500 (kg)"),

  body("nationality")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("nationality must be 100 characters or fewer"),

  body("notes")
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage("notes must be 2000 characters or fewer"),

  handleValidationErrors,
];

// ── Partial (PATCH) validation ─────────────────────────────────────────────────
exports.validateAthleteUpdate = [
  body("firstName")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("firstName must be 100 characters or fewer"),

  body("lastName")
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("lastName must be 100 characters or fewer"),

  body("dateOfBirth")
    .optional()
    .isISO8601().withMessage("dateOfBirth must be a valid ISO 8601 date")
    .custom((value) => {
      const dob = new Date(value);
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 5 || age > 100) throw new Error("Athlete age must be between 5 and 100");
      return true;
    }),

  body("sport")
    .optional()
    .isIn(VALID_SPORTS).withMessage(`sport must be one of: ${VALID_SPORTS.join(", ")}`),

  body("email")
    .optional()
    .isEmail().withMessage("email must be a valid email address")
    .normalizeEmail(),

  body("status")
    .optional()
    .isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(", ")}`),

  body("height")
    .optional()
    .isFloat({ min: 50, max: 300 }).withMessage("height must be between 50 and 300 (cm)"),

  body("weight")
    .optional()
    .isFloat({ min: 20, max: 500 }).withMessage("weight must be between 20 and 500 (kg)"),

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
