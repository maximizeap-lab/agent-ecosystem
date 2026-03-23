const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const AppError = require("../utils/AppError");
const { buildFilterQuery, buildSortClause } = require("../utils/queryBuilder");

// ── GET /performances ──────────────────────────────────────────────────────────
exports.getAllPerformances = async (req, res, next) => {
  try {
    const { athleteId, metric, startDate, endDate, sort = "recordedAt", order = "desc" } = req.query;
    const { limit, offset } = req.pagination;

    const filters = {};
    if (athleteId) filters.athleteId = athleteId;
    if (metric) filters.metric = metric;
    if (startDate || endDate) {
      filters.recordedAt = {};
      if (startDate) filters.recordedAt.$gte = new Date(startDate);
      if (endDate) filters.recordedAt.$lte = new Date(endDate);
    }

    const sortClause = buildSortClause(sort, order, ["recordedAt", "metric", "value", "createdAt"]);

    const { rows: performances, count } = await db.performances.findAndCountAll({
      where: filters,
      include: [{ model: db.athletes, as: "athlete", attributes: ["id", "firstName", "lastName"] }],
      order: sortClause,
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

// ── GET /performances/summary ──────────────────────────────────────────────────
exports.getPerformanceSummary = async (req, res, next) => {
  try {
    const { athleteId, groupBy = "month", metric } = req.query;

    const filters = {};
    if (athleteId) filters.athleteId = athleteId;
    if (metric) filters.metric = metric;

    // Simulated aggregation — replace with actual DB aggregation query
    const records = await db.performances.findAll({ where: filters });

    const summary = records.reduce((acc, record) => {
      const key =
        groupBy === "month"
          ? record.recordedAt.toISOString().slice(0, 7)
          : record.recordedAt.toISOString().slice(0, 10);

      if (!acc[key]) acc[key] = { period: key, count: 0, totalValue: 0, minValue: Infinity, maxValue: -Infinity };
      acc[key].count += 1;
      acc[key].totalValue += record.value;
      acc[key].minValue = Math.min(acc[key].minValue, record.value);
      acc[key].maxValue = Math.max(acc[key].maxValue, record.value);
      return acc;
    }, {});

    const summaryArray = Object.values(summary).map((s) => ({
      ...s,
      avgValue: s.count > 0 ? parseFloat((s.totalValue / s.count).toFixed(2)) : 0,
    }));

    summaryArray.sort((a, b) => a.period.localeCompare(b.period));

    res.json({ success: true, data: summaryArray });
  } catch (err) {
    next(err);
  }
};

// ── GET /performances/:id ──────────────────────────────────────────────────────
exports.getPerformanceById = async (req, res, next) => {
  try {
    const performance = await db.performances.findOne({
      where: { id: req.params.id },
      include: [{ model: db.athletes, as: "athlete", attributes: ["id", "firstName", "lastName"] }],
    });

    if (!performance) throw new AppError("Performance record not found", 404);

    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
};

// ── POST /performances ─────────────────────────────────────────────────────────
exports.createPerformance = async (req, res, next) => {
  try {
    const { athleteId, sessionId, metric, value, unit, recordedAt, notes, tags } = req.body;

    const athlete = await db.athletes.findOne({ where: { id: athleteId, deletedAt: null } });
    if (!athlete) throw new AppError("Referenced athlete not found", 404);

    if (sessionId) {
      const session = await db.sessions.findOne({ where: { id: sessionId } });
      if (!session) throw new AppError("Referenced session not found", 404);
    }

    const performance = await db.performances.create({
      id: uuidv4(),
      athleteId,
      sessionId: sessionId || null,
      metric,
      value,
      unit,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      notes,
      tags: tags || [],
    });

    res.status(201).json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
};

// ── PUT /performances/:id ──────────────────────────────────────────────────────
exports.updatePerformance = async (req, res, next) => {
  try {
    const performance = await db.performances.findOne({ where: { id: req.params.id } });
    if (!performance) throw new AppError("Performance record not found", 404);

    const { athleteId, sessionId, metric, value, unit, recordedAt, notes, tags } = req.body;

    if (athleteId && athleteId !== performance.athleteId) {
      const athlete = await db.athletes.findOne({ where: { id: athleteId, deletedAt: null } });
      if (!athlete) throw new AppError("Referenced athlete not found", 404);
    }

    await performance.update({
      athleteId,
      sessionId: sessionId || null,
      metric,
      value,
      unit,
      recordedAt: recordedAt ? new Date(recordedAt) : performance.recordedAt,
      notes,
      tags: tags || [],
      updatedAt: new Date(),
    });

    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /performances/:id ────────────────────────────────────────────────────
exports.patchPerformance = async (req, res, next) => {
  try {
    const performance = await db.performances.findOne({ where: { id: req.params.id } });
    if (!performance) throw new AppError("Performance record not found", 404);

    const allowedFields = ["metric", "value", "unit", "recordedAt", "notes", "tags", "sessionId"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.recordedAt) updates.recordedAt = new Date(updates.recordedAt);

    await performance.update({ ...updates, updatedAt: new Date() });

    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /performances/:id ───────────────────────────────────────────────────
exports.deletePerformance = async (req, res, next) => {
  try {
    const performance = await db.performances.findOne({ where: { id: req.params.id } });
    if (!performance) throw new AppError("Performance record not found", 404);

    await performance.destroy();

    res.json({ success: true, message: "Performance record deleted successfully" });
  } catch (err) {
    next(err);
  }
};
