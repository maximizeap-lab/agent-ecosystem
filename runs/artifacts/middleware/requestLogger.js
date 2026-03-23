/**
 * Attaches a unique request ID to every incoming request and
 * logs completion with method, path, status, and duration.
 */
const { v4: uuidv4 } = require("uuid");

exports.requestLogger = (req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";
    console.log(
      `[${level}] ${req.requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};
