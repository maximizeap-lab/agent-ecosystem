const { param, validationResult } = require("express-validator");

/**
 * Reusable UUID path-parameter validator.
 * Usage: validateUUID("id"), validateUUID("athleteId")
 */
exports.validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID v4`),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: "Invalid identifier",
        details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    next();
  },
];
