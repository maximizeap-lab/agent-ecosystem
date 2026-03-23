/**
 * performance.test.js
 * -------------------
 * Integration tests for the performance data endpoints.
 */

import request from "supertest";
import app from "../server.js";

const BASE = "/api/v1/performance";

let createdId;

describe("Performance Data Endpoints", () => {
  // ── CREATE ────────────────────────────────────────────────────────────────
  describe("POST /performance", () => {
    it("should log a new performance record and return 201", async () => {
      const payload = {
        athleteId: "athlete-001",
        sessionDate: "2024-07-10",
        sessionType: "training",
        event: "200m Sprint",
        duration_min: 45,
        distance_km: 0.2,
        metrics: { time_sec: 21.5, avgHeartRate_bpm: 178 },
        rpe: 8,
        notes: "Focused on acceleration phase.",
      };

      const res = await request(app).post(BASE).send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toBe("200m Sprint");
      expect(res.body.data.id).toBeDefined();

      createdId = res.body.data.id;
    });

    it("should return 404 when athleteId does not exist", async () => {
      const res = await request(app).post(BASE).send({
        athleteId: "ghost-athlete",
        sessionDate: "2024-07-10",
        sessionType: "training",
        event: "100m Sprint",
      });
      expect(res.status).toBe(404);
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app).post(BASE).send({ athleteId: "athlete-001" });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it("should return 400 for an invalid sessionType", async () => {
      const res = await request(app).post(BASE).send({
        athleteId: "athlete-001",
        sessionDate: "2024-07-10",
        sessionType: "marathon",      // not in enum
        event: "10K Run",
      });
      expect(res.status).toBe(400);
    });

    it("should return 400 for RPE out of range", async () => {
      const res = await request(app).post(BASE).send({
        athleteId: "athlete-001",
        sessionDate: "2024-07-10",
        sessionType: "training",
        event: "Drills",
        rpe: 11,    // max is 10
      });
      expect(res.status).toBe(400);
    });
  });

  // ── READ ALL ─────────────────────────────────────────────────────────────
  describe("GET /performance", () => {
    it("should return a paginated list of records", async () => {
      const res = await request(app).get(BASE);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it("should filter by athleteId", async () => {
      const res = await request(app).get(`${BASE}?athleteId=athlete-001`);
      expect(res.status).toBe(200);
      res.body.data.forEach((r) => expect(r.athleteId).toBe("athlete-001"));
    });

    it("should filter by sessionType", async () => {
      const res = await request(app).get(`${BASE}?sessionType=training`);
      expect(res.status).toBe(200);
      res.body.data.forEach((r) => expect(r.sessionType).toBe("training"));
    });

    it("should support date range filtering", async () => {
      const res = await request(app).get(`${BASE}?startDate=2024-06-01&endDate=2024-06-30`);
      expect(res.status).toBe(200);
    });
  });

  // ── ATHLETE SCOPED ────────────────────────────────────────────────────────
  describe("GET /performance/athlete/:athleteId", () => {
    it("should return all records for a given athlete", async () => {
      const res = await request(app).get(`${BASE}/athlete/athlete-002`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((r) => expect(r.athleteId).toBe("athlete-002"));
    });

    it("should return 404 for a non-existent athlete", async () => {
      const res = await request(app).get(`${BASE}/athlete/ghost-id`);
      expect(res.status).toBe(404);
    });
  });

  // ── READ ONE ─────────────────────────────────────────────────────────────
  describe("GET /performance/:id", () => {
    it("should return a single record enriched with athlete data", async () => {
      const res = await request(app).get(`${BASE}/perf-001`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("perf-001");
      expect(res.body.data.athlete).toBeDefined();
      expect(res.body.data.athlete.firstName).toBe("Jordan");
    });

    it("should return 404 for a missing record", async () => {
      const res = await request(app).get(`${BASE}/no-such-record`);
      expect(res.status).toBe(404);
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  describe("PATCH /performance/:id", () => {
    it("should update the record and return the updated data", async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdId}`)
        .send({ rpe: 9, notes: "Updated notes after review." });

      expect(res.status).toBe(200);
      expect(res.body.data.rpe).toBe(9);
      expect(res.body.data.notes).toBe("Updated notes after review.");
    });

    it("should not allow changing the athleteId", async () => {
      const res = await request(app)
        .patch(`${BASE}/${createdId}`)
        .send({ athleteId: "athlete-002" });

      // athleteId is stripped by Joi (stripUnknown) in PATCH schema — so it's ignored
      // Record should still belong to athlete-001
      if (res.status === 200) {
        expect(res.body.data.athleteId).toBe("athlete-001");
      }
    });

    it("should return 400 for an empty PATCH body", async () => {
      const res = await request(app).patch(`${BASE}/${createdId}`).send({});
      expect(res.status).toBe(400);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  describe("DELETE /performance/:id", () => {
    it("should delete the performance record and return 200", async () => {
      const res = await request(app).delete(`${BASE}/${createdId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.deletedId).toBe(createdId);
    });

    it("should return 404 on second delete attempt", async () => {
      const res = await request(app).delete(`${BASE}/${createdId}`);
      expect(res.status).toBe(404);
    });
  });
});
