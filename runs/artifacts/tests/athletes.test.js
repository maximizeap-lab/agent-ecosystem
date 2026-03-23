const request = require("supertest");
const app = require("../server");
const db = require("../db");

// ── Shared test data ───────────────────────────────────────────────────────────
let createdAthleteId;

const validAthlete = {
  firstName: "Serena",
  lastName: "Williams",
  dateOfBirth: "1981-09-26",
  sport: "tennis",
  email: `serena.test.${Date.now()}@example.com`,
  position: "Singles",
  height: 175,
  weight: 70,
  nationality: "American",
};

// ── Setup / Teardown ───────────────────────────────────────────────────────────
afterAll(async () => {
  if (createdAthleteId) {
    await db.athletes.destroy({ where: { id: createdAthleteId }, force: true });
  }
  await db.sequelize.close();
});

// ── POST /athletes ─────────────────────────────────────────────────────────────
describe("POST /api/v1/athletes", () => {
  it("creates a new athlete and returns 201", async () => {
    const res = await request(app).post("/api/v1/athletes").send(validAthlete);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      firstName: validAthlete.firstName,
      lastName: validAthlete.lastName,
      sport: validAthlete.sport,
    });

    createdAthleteId = res.body.data.id;
  });

  it("returns 409 when email is already taken", async () => {
    const res = await request(app).post("/api/v1/athletes").send(validAthlete);
    expect(res.status).toBe(409);
  });

  it("returns 422 when required fields are missing", async () => {
    const res = await request(app).post("/api/v1/athletes").send({ firstName: "Only" });
    expect(res.status).toBe(422);
    expect(res.body.details).toBeDefined();
  });

  it("returns 422 for an invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/athletes")
      .send({ ...validAthlete, email: "not-an-email" });
    expect(res.status).toBe(422);
  });

  it("returns 422 for an invalid dateOfBirth", async () => {
    const res = await request(app)
      .post("/api/v1/athletes")
      .send({ ...validAthlete, dateOfBirth: "not-a-date" });
    expect(res.status).toBe(422);
  });
});

// ── GET /athletes ──────────────────────────────────────────────────────────────
describe("GET /api/v1/athletes", () => {
  it("returns a paginated list of athletes", async () => {
    const res = await request(app).get("/api/v1/athletes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty("total");
  });

  it("respects ?limit and ?page params", async () => {
    const res = await request(app).get("/api/v1/athletes?page=1&limit=2");
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });
});

// ── GET /athletes/:id ──────────────────────────────────────────────────────────
describe("GET /api/v1/athletes/:id", () => {
  it("returns the athlete when found", async () => {
    const res = await request(app).get(`/api/v1/athletes/${createdAthleteId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdAthleteId);
  });

  it("returns 404 for a non-existent athlete", async () => {
    const res = await request(app).get("/api/v1/athletes/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid UUID", async () => {
    const res = await request(app).get("/api/v1/athletes/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

// ── PATCH /athletes/:id ────────────────────────────────────────────────────────
describe("PATCH /api/v1/athletes/:id", () => {
  it("partially updates an athlete", async () => {
    const res = await request(app)
      .patch(`/api/v1/athletes/${createdAthleteId}`)
      .send({ weight: 72 });

    expect(res.status).toBe(200);
    expect(res.body.data.weight).toBe(72);
  });

  it("returns 422 for invalid status value", async () => {
    const res = await request(app)
      .patch(`/api/v1/athletes/${createdAthleteId}`)
      .send({ status: "flying" });
    expect(res.status).toBe(422);
  });
});

// ── PUT /athletes/:id ──────────────────────────────────────────────────────────
describe("PUT /api/v1/athletes/:id", () => {
  it("fully replaces an athlete record", async () => {
    const updated = { ...validAthlete, firstName: "Venus", weight: 68 };
    const res = await request(app)
      .put(`/api/v1/athletes/${createdAthleteId}`)
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe("Venus");
  });
});

// ── DELETE /athletes/:id ───────────────────────────────────────────────────────
describe("DELETE /api/v1/athletes/:id", () => {
  it("soft-deletes an athlete", async () => {
    const res = await request(app).delete(`/api/v1/athletes/${createdAthleteId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when athlete is already deleted", async () => {
    const res = await request(app).delete(`/api/v1/athletes/${createdAthleteId}`);
    expect(res.status).toBe(404);
  });
});
