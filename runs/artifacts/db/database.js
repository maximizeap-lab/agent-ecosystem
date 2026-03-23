/**
 * database.js
 * -----------
 * Lightweight in-memory store that mimics a relational DB layer.
 * Swap out `db.athletes` / `db.performance` with real ORM calls
 * (e.g. Prisma, Sequelize, Mongoose) without touching route logic.
 */

import { v4 as uuidv4 } from "uuid";

// ─── Seed Data ───────────────────────────────────────────────────────────────
const athletes = new Map([
  [
    "athlete-001",
    {
      id: "athlete-001",
      firstName: "Jordan",
      lastName: "Reeves",
      email: "jordan.reeves@teamalpha.com",
      dateOfBirth: "1998-04-12",
      sport: "Track & Field",
      position: "Sprinter",
      team: "Team Alpha",
      nationality: "USA",
      height_cm: 182,
      weight_kg: 78,
      status: "active",
      createdAt: "2024-01-15T09:00:00.000Z",
      updatedAt: "2024-01-15T09:00:00.000Z",
    },
  ],
  [
    "athlete-002",
    {
      id: "athlete-002",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@teamalpha.com",
      dateOfBirth: "2000-07-23",
      sport: "Swimming",
      position: "Freestyle",
      team: "Team Alpha",
      nationality: "Canada",
      height_cm: 168,
      weight_kg: 62,
      status: "active",
      createdAt: "2024-01-20T10:30:00.000Z",
      updatedAt: "2024-01-20T10:30:00.000Z",
    },
  ],
]);

const performance = new Map([
  [
    "perf-001",
    {
      id: "perf-001",
      athleteId: "athlete-001",
      sessionDate: "2024-06-01",
      sessionType: "race",
      event: "100m Sprint",
      duration_min: 30,
      distance_km: 0.1,
      metrics: {
        time_sec: 10.42,
        reactionTime_sec: 0.148,
        topSpeed_kmh: 37.8,
        avgHeartRate_bpm: 192,
        peakHeartRate_bpm: 201,
      },
      rpe: 9,
      notes: "PB attempt. Strong start, slight fade at 80m.",
      createdAt: "2024-06-01T14:00:00.000Z",
      updatedAt: "2024-06-01T14:00:00.000Z",
    },
  ],
  [
    "perf-002",
    {
      id: "perf-002",
      athleteId: "athlete-002",
      sessionDate: "2024-06-03",
      sessionType: "training",
      event: "400m Freestyle",
      duration_min: 60,
      distance_km: 2.4,
      metrics: {
        time_sec: 268.5,
        avgSplitTime_sec: 67.1,
        strokeRate_spm: 38,
        avgHeartRate_bpm: 168,
        peakHeartRate_bpm: 185,
        laps: 16,
      },
      rpe: 7,
      notes: "Focused on turn technique. Splits very consistent.",
      createdAt: "2024-06-03T08:00:00.000Z",
      updatedAt: "2024-06-03T08:00:00.000Z",
    },
  ],
]);

// ─── Athlete Store ────────────────────────────────────────────────────────────
export const athleteStore = {
  findAll: ({ sport, team, status, search, page = 1, limit = 20 } = {}) => {
    let results = Array.from(athletes.values());

    if (sport)   results = results.filter((a) => a.sport.toLowerCase() === sport.toLowerCase());
    if (team)    results = results.filter((a) => a.team.toLowerCase() === team.toLowerCase());
    if (status)  results = results.filter((a) => a.status === status);
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (a) =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q)
      );
    }

    const total = results.length;
    const offset = (page - 1) * limit;
    const paginated = results.slice(offset, offset + limit);

    return { data: paginated, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  },

  findById: (id) => athletes.get(id) || null,

  create: (payload) => {
    const id = `athlete-${uuidv4()}`;
    const now = new Date().toISOString();
    const record = { id, ...payload, status: payload.status || "active", createdAt: now, updatedAt: now };
    athletes.set(id, record);
    return record;
  },

  update: (id, payload) => {
    const existing = athletes.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...payload, id, updatedAt: new Date().toISOString() };
    athletes.set(id, updated);
    return updated;
  },

  delete: (id) => {
    if (!athletes.has(id)) return false;
    athletes.delete(id);
    return true;
  },
};

// ─── Performance Store ────────────────────────────────────────────────────────
export const performanceStore = {
  findAll: ({ athleteId, sessionType, event, startDate, endDate, page = 1, limit = 20 } = {}) => {
    let results = Array.from(performance.values());

    if (athleteId)   results = results.filter((p) => p.athleteId === athleteId);
    if (sessionType) results = results.filter((p) => p.sessionType === sessionType);
    if (event)       results = results.filter((p) => p.event.toLowerCase().includes(event.toLowerCase()));
    if (startDate)   results = results.filter((p) => p.sessionDate >= startDate);
    if (endDate)     results = results.filter((p) => p.sessionDate <= endDate);

    results.sort((a, b) => (b.sessionDate > a.sessionDate ? 1 : -1));

    const total = results.length;
    const offset = (page - 1) * limit;
    const paginated = results.slice(offset, offset + limit);

    return { data: paginated, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  },

  findById: (id) => performance.get(id) || null,

  findByAthleteId: (athleteId) =>
    Array.from(performance.values()).filter((p) => p.athleteId === athleteId),

  create: (payload) => {
    const id = `perf-${uuidv4()}`;
    const now = new Date().toISOString();
    const record = { id, ...payload, createdAt: now, updatedAt: now };
    performance.set(id, record);
    return record;
  },

  update: (id, payload) => {
    const existing = performance.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...payload,
      id,
      athleteId: existing.athleteId, // athleteId is immutable after creation
      updatedAt: new Date().toISOString(),
    };
    performance.set(id, updated);
    return updated;
  },

  delete: (id) => {
    if (!performance.has(id)) return false;
    performance.delete(id);
    return true;
  },

  deleteByAthleteId: (athleteId) => {
    let count = 0;
    for (const [key, val] of performance.entries()) {
      if (val.athleteId === athleteId) {
        performance.delete(key);
        count++;
      }
    }
    return count;
  },

  summarize: (athleteId) => {
    const records = Array.from(performance.values()).filter((p) => p.athleteId === athleteId);
    if (!records.length) return null;

    const totalSessions = records.length;
    const totalDistance = records.reduce((s, r) => s + (r.distance_km || 0), 0);
    const totalDuration = records.reduce((s, r) => s + (r.duration_min || 0), 0);
    const avgRpe = records.reduce((s, r) => s + (r.rpe || 0), 0) / totalSessions;
    const byType = records.reduce((acc, r) => {
      acc[r.sessionType] = (acc[r.sessionType] || 0) + 1;
      return acc;
    }, {});
    const recent = [...records].sort((a, b) => (b.sessionDate > a.sessionDate ? 1 : -1)).slice(0, 5);

    return { totalSessions, totalDistance_km: +totalDistance.toFixed(2), totalDuration_min: totalDuration, avgRpe: +avgRpe.toFixed(1), sessionsByType: byType, recentSessions: recent };
  },
};
