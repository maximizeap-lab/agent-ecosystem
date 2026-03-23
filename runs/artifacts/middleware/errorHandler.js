const AppError = require("../utils/AppError");

/**
 * Centralised Express error handler.
 * Must be registered LAST with app.use().
 */
module.exports = function errorHandler(err, req, res, _next) {
  // Known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Sequelize / database unique constraint
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      error: "A record with these unique values already exists",
      details: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize / database validation error
  if (err.name === "SequelizeValidationError") {
    return res.status(422).json({
      success: false,
      error: "Database validation error",
      details: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize / foreign key constraint
  if (err.name === "SequelizeForeignKeyConstraintError") {
    return res.status(409).json({
      success: false,
      error: "Operation violates a foreign key constraint",
    });
  }

  // JSON parse errors from express.json()
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON payload",
    });
  }

  // Generic / unexpected errors
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "An unexpected internal server error occurred",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
