const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const AppError = require("../utils/AppError");
const { buildSortClause } = require("../utils/queryBuilder");

// ── GET /sessions ──────────────────────────────────────────────────────────────
exports.getAllSessions = async (req, res, next) => {
  try {
    const { athleteId, type, status, coachId, sort = "scheduledAt", order = "desc" } = req.query;
    const { limit, offset } = req.pagination;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (coachId) filters.coachId = coachId;

    const sortClause = buildSortClause(sort, order, ["scheduledAt", "type", "status", "createdAt"]);

    let include = [];
    if (athleteId) {
      include = [
        {
          model: db.sessionAthletes,
          as: "enrollments",
          where: { athleteId },
          required: true,
        },
      ];
    }

    const { rows: sessions, count } = await db.sessions.findAndCountAll({
      where: filters,
      include,
      order: sortClause,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: sessions,
      pagination: {
        total: count,
        page: req.pagination.page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /sessions/:id ──────────────────────────────────────────────────────────
exports.getSessionById = async (req, res, next) => {
  try {
    const session = await db.sessions.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: db.sessionAthletes,
          as: "enrollments",
          include: [{ model: db.athletes, as: "athlete", attributes: ["id", "firstName", "lastName", "sport"] }],
        },
      ],
    });

    if (!session) throw new AppError("Training session not found", 404);

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── GET /sessions/:id/athletes ─────────────────────────────────────────────────
exports.getSessionAthletes = async (req, res, next) => {
  try {
    const session = await db.sessions.findOne({ where: { id: req.params.id } });
    if (!session) throw new AppError("Training session not found", 404);

    const enrollments = await db.sessionAthletes.findAll({
      where: { sessionId: req.params.id },
      include: [{ model: db.athletes, as: "athlete" }],
    });

    res.json({
      success: true,
      data: enrollments.map((e) => e.athlete),
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /sessions ─────────────────────────────────────────────────────────────
exports.createSession = async (req, res, next) => {
  try {
    const {
      title,
      type,
      coachId,
      location,
      scheduledAt,
      durationMinutes,
      maxCapacity,
      notes,
      goals,
    } = req.body;

    const session = await db.sessions.create({
      id: uuidv4(),
      title,
      type,
      coachId: coachId || null,
      location,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      maxCapacity: maxCapacity || null,
      notes,
      goals: goals || [],
      status: "scheduled",
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── POST /sessions/:id/athletes ────────────────────────────────────────────────
exports.enrollAthletes = async (req, res, next) => {
  try {
    const { athleteIds } = req.body;

    if (!Array.isArray(athleteIds) || athleteIds.length === 0) {
      throw new AppError("athleteIds must be a non-empty array", 400);
    }

    const session = await db.sessions.findOne({ where: { id: req.params.id } });
    if (!session) throw new AppError("Training session not found", 404);

    if (session.status === "cancelled") {
      throw new AppError("Cannot enroll athletes into a cancelled session", 400);
    }

    // Check capacity
    if (session.maxCapacity) {
      const currentCount = await db.sessionAthletes.count({
        where: { sessionId: req.params.id },
      });
      if (currentCount + athleteIds.length > session.maxCapacity) {
        throw new AppError(
          `Enrollment would exceed session capacity of ${session.maxCapacity}`,
          400
        );
      }
    }

    const enrolled = [];
    const skipped = [];

    for (const athleteId of athleteIds) {
      const athlete = await db.athletes.findOne({ where: { id: athleteId, deletedAt: null } });
      if (!athlete) { skipped.push({ athleteId, reason: "Athlete not found" }); continue; }

      const existing = await db.sessionAthletes.findOne({
        where: { sessionId: req.params.id, athleteId },
      });
      if (existing) { skipped.push({ athleteId, reason: "Already enrolled" }); continue; }

      await db.sessionAthletes.create({
        id: uuidv4(),
        sessionId: req.params.id,
        athleteId,
        enrolledAt: new Date(),
      });
      enrolled.push(athleteId);
    }

    res.status(200).json({
      success: true,
      data: { enrolled, skipped },
      message: `${enrolled.length} athlete(s) enrolled, ${skipped.length} skipped`,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /sessions/:id ──────────────────────────────────────────────────────────
exports.updateSession = async (req, res, next) => {
  try {
    const session = await db.sessions.findOne({ where: { id: req.params.id } });
    if (!session) throw new AppError("Training session not found", 404);

    const {
      title, type, coachId, location, scheduledAt,
      durationMinutes, maxCapacity, notes, goals, status,
    } = req.body;

    await session.update({
      title,
      type,
      coachId: coachId || null,
      location,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : session.scheduledAt,
      durationMinutes,
      maxCapacity: maxCapacity || null,
      notes,
      goals: goals || [],
      status,
      updatedAt: new Date(),
    });

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /sessions/:id ────────────────────────────────────────────────────────
exports.patchSession = async (req, res, next) => {
  try {
    const session = await db.sessions.findOne({ where: { id: req.params.id } });
    if (!session) throw new AppError("Training session not found", 404);

    const allowedFields = [
      "title", "type", "coachId", "location", "scheduledAt",
      "durationMinutes", "maxCapacity", "notes", "goals", "status",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.scheduledAt) updates.scheduledAt = new Date(updates.scheduledAt);

    await session.update({ ...updates, updatedAt: new Date() });

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /sessions/:id/athletes/:athleteId ───────────────────────────────────
exports.removeAthleteFromSession = async (req, res, next) => {
  try {
    const enrollment = await db.sessionAthletes.findOne({
      where: { sessionId: req.params.id, athleteId: req.params.athleteId },
    });

    if (!enrollment) throw new AppError("Athlete is not enrolled in this session", 404);

    await enrollment.destroy();

    res.json({ success: true, message: "Athlete removed from session successfully" });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /sessions/:id ───────────────────────────────────────────────────────
exports.deleteSession = async (req, res, next) => {
  try {
    const session = await db.sessions.findOne({ where: { id: req.params.id } });
    if (!session) throw new AppError("Training session not found", 404);

    // Cancel rather than hard-delete to preserve performance record FK integrity
    if (session.status !== "completed") {
      await session.update({ status: "cancelled", updatedAt: new Date() });
      return res.json({ success: true, message: "Session cancelled successfully" });
    }

    await session.destroy();
    res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    next(err);
  }
};
