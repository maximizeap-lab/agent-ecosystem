const request = require("supertest");
const app = require("../server");
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

let testAthleteId;
let createdPerformanceId;

const validPerformance = () => ({
  athleteId: testAthleteId,
  metric: "speed",
  value: 9.58,
  unit: "m/s",
  recordedAt: "2024-06-15T10:30:00.000Z",
  notes: "Personal best in sprint",
  tags: ["sprint", "outdoor"],
});

// ── Setup ──────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  const athlete = await db.athletes.create({
    id: uuidv4(),
    firstName: "Usain",
    lastName: "Bolt",
    dateOfBirth: "1986-08-21",
    sport: "athletics",
    email: `bolt.perf.${Date.now()}@example.com`,
    status: "active",
  });
  testAthleteId = athlete.id;
});

afterAll(async () => {
  await db.performances.destroy({ where: {}, truncate: true, force: true });
  await db.athletes.destroy({ where: { id: testAthleteId }, force: true });
  await db.sequelize.close();
});

// ── POST /performances ─────────────────────────────────────────────────────────
describe("POST /api/v1/performances", () => {
  it("creates a performance record and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/performances")
      .send(validPerformance());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metric).toBe("speed");
    createdPerformanceId = res.body.data.id;
  });

  it("returns 404 if athleteId does not exist", async () => {
    const res = await request(app).post("/api/v1/performances").send({
      ...validPerformance(),
      athleteId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.status).toBe(404);
  });

  it("returns 422 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/v1/performances")
      .send({ athleteId: testAthleteId });
    expect(res.status).toBe(422);
  });

  it("returns 422 for an invalid metric", async () => {
    const res = await request(app).post("/api/v1/performances").send({
      ...validPerformance(),
      metric: "invisible_metric",
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 for a future recordedAt date", async () => {
    const res = await request(app).post("/api/v1/performances").send({
      ...validPerformance(),
      recordedAt: "2099-01-01T00:00:00.000Z",
    });
    expect(res.status).toBe(422);
  });
});

// ── GET /performances ──────────────────────────────────────────────────────────
describe("GET /api/v1/performances", () => {
  it("returns paginated performance records", async () => {
    const res = await request(app).get("/api/v1/performances");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("filters by athleteId", async () => {
    const res = await request(app).get(`/api/v1/performances?athleteId=${testAthleteId}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((p) => expect(p.athleteId).toBe(testAthleteId));
  });
});

// ── GET /performances/summary ──────────────────────────────────────────────────
describe("GET /api/v1/performances/summary", () => {
  it("returns a summary grouped by month", async () => {
    const res = await request(app).get(
      `/api/v1/performances/summary?athleteId=${testAthleteId}&groupBy=month`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ── GET /performances/:id ──────────────────────────────────────────────────────
describe("GET /api/v1/performances/:id", () => {
  it("returns the performance when found", async () => {
    const res = await request(app).get(`/api/v1/performances/${createdPerformanceId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdPerformanceId);
  });

  it("returns 404 for a non-existent record", async () => {
    const res = await request(app).get(
      "/api/v1/performances/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status).toBe(404);
  });
});

// ── PATCH /performances/:id ────────────────────────────────────────────────────
describe("PATCH /api/v1/performances/:id", () => {
  it("updates the value field", async () => {
    const res = await request(app)
      .patch(`/api/v1/performances/${createdPerformanceId}`)
      .send({ value: 10.2, notes: "Updated after review" });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(10.2);
  });
});

// ── DELETE /performances/:id ───────────────────────────────────────────────────
describe("DELETE /api/v1/performances/:id", () => {
  it("deletes the performance record", async () => {
    const res = await request(app).delete(`/api/v1/performances/${createdPerformanceId}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 after deletion", async () => {
    const res = await request(app).get(`/api/v1/performances/${createdPerformanceId}`);
    expect(res.status).toBe(404);
  });
});
