const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const AppError = require("../utils/AppError");
const { buildFilterQuery, buildSortClause } = require("../utils/queryBuilder");

// ── GET /athletes ──────────────────────────────────────────────────────────────
exports.getAllAthletes = async (req, res, next) => {
  try {
    const { sport, position, status, sort = "lastName", order = "asc" } = req.query;
    const { limit, offset } = req.pagination;

    const filters = buildFilterQuery({ sport, position, status });
    const sortClause = buildSortClause(sort, order, ["lastName", "firstName", "createdAt", "sport"]);

    const { rows: athletes, count } = await db.athletes.findAndCountAll({
      where: { ...filters, deletedAt: null },
      order: sortClause,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: athletes,
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

// ── GET /athletes/:id ──────────────────────────────────────────────────────────
exports.getAthleteById = async (req, res, next) => {
  try {
    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });

    if (!athlete) throw new AppError("Athlete not found", 404);

    res.json({ success: true, data: athlete });
  } catch (err) {
    next(err);
  }
};

// ── GET /athletes/:id/performances ────────────────────────────────────────────
exports.getAthletePerformances = async (req, res, next) => {
  try {
    const { startDate, endDate, metric } = req.query;
    const { limit, offset } = req.pagination;

    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!athlete) throw new AppError("Athlete not found", 404);

    const filters = { athleteId: req.params.id };
    if (metric) filters.metric = metric;
    if (startDate || endDate) {
      filters.recordedAt = {};
      if (startDate) filters.recordedAt.$gte = new Date(startDate);
      if (endDate) filters.recordedAt.$lte = new Date(endDate);
    }

    const { rows: performances, count } = await db.performances.findAndCountAll({
      where: filters,
      order: [["recordedAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: performances,
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

// ── GET /athletes/:id/sessions ─────────────────────────────────────────────────
exports.getAthleteSessions = async (req, res, next) => {
  try {
    const { limit, offset } = req.pagination;

    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!athlete) throw new AppError("Athlete not found", 404);

    const { rows: sessions, count } = await db.sessionAthletes.findAndCountAll({
      where: { athleteId: req.params.id },
      include: [{ model: db.sessions, as: "session" }],
      order: [["session", "scheduledAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: sessions.map((sa) => sa.session),
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

// ── POST /athletes ─────────────────────────────────────────────────────────────
exports.createAthlete = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      sport,
      position,
      teamId,
      email,
      phone,
      height,
      weight,
      nationality,
      notes,
    } = req.body;

    const existing = await db.athletes.findOne({ where: { email } });
    if (existing) throw new AppError("An athlete with this email already exists", 409);

    const athlete = await db.athletes.create({
      id: uuidv4(),
      firstName,
      lastName,
      dateOfBirth,
      sport,
      position,
      teamId,
      email,
      phone,
      height,
      weight,
      nationality,
      notes,
      status: "active",
    });

    res.status(201).json({ success: true, data: athlete });
  } catch (err) {
    next(err);
  }
};

// ── PUT /athletes/:id ──────────────────────────────────────────────────────────
exports.updateAthlete = async (req, res, next) => {
  try {
    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!athlete) throw new AppError("Athlete not found", 404);

    const {
      firstName,
      lastName,
      dateOfBirth,
      sport,
      position,
      teamId,
      email,
      phone,
      height,
      weight,
      nationality,
      status,
      notes,
    } = req.body;

    if (email && email !== athlete.email) {
      const conflict = await db.athletes.findOne({ where: { email } });
      if (conflict) throw new AppError("Email already in use by another athlete", 409);
    }

    await athlete.update({
      firstName,
      lastName,
      dateOfBirth,
      sport,
      position,
      teamId,
      email,
      phone,
      height,
      weight,
      nationality,
      status,
      notes,
      updatedAt: new Date(),
    });

    res.json({ success: true, data: athlete });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /athletes/:id ────────────────────────────────────────────────────────
exports.patchAthlete = async (req, res, next) => {
  try {
    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!athlete) throw new AppError("Athlete not found", 404);

    const allowedFields = [
      "firstName", "lastName", "dateOfBirth", "sport", "position",
      "teamId", "email", "phone", "height", "weight",
      "nationality", "status", "notes",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.email && updates.email !== athlete.email) {
      const conflict = await db.athletes.findOne({ where: { email: updates.email } });
      if (conflict) throw new AppError("Email already in use by another athlete", 409);
    }

    await athlete.update({ ...updates, updatedAt: new Date() });

    res.json({ success: true, data: athlete });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /athletes/:id ───────────────────────────────────────────────────────
exports.deleteAthlete = async (req, res, next) => {
  try {
    const athlete = await db.athletes.findOne({
      where: { id: req.params.id, deletedAt: null },
    });
    if (!athlete) throw new AppError("Athlete not found", 404);

    // Soft delete
    await athlete.update({ deletedAt: new Date(), status: "inactive" });

    res.json({ success: true, message: "Athlete deleted successfully" });
  } catch (err) {
    next(err);
  }
};
