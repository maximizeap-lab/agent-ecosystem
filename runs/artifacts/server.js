const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { v4: uuidv4 } = require("uuid");

const athleteRoutes = require("./routes/athletes");
const performanceRoutes = require("./routes/performances");
const sessionRoutes = require("./routes/sessions");
const errorHandler = require("./middleware/errorHandler");
const { requestLogger } = require("./middleware/requestLogger");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Core Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(requestLogger);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/v1/athletes", athleteRoutes);
app.use("/api/v1/performances", performanceRoutes);
app.use("/api/v1/sessions", sessionRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🏋️  Athlete API running on http://localhost:${PORT}`);
  console.log(`📋  API docs available at http://localhost:${PORT}/api/v1`);
});

module.exports = app;
