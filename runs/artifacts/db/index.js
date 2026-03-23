/**
 * Database layer — Sequelize + PostgreSQL
 *
 * Swap the connection string or dialect to target a different DB.
 * All models are registered here and associations are defined at
 * the bottom so every model file stays clean.
 */

const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost:5432/athlete_db",
  {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// ── Model definitions ──────────────────────────────────────────────────────────

const Athlete = sequelize.define(
  "Athlete",
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    firstName:   { type: DataTypes.STRING(100), allowNull: false },
    lastName:    { type: DataTypes.STRING(100), allowNull: false },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: false },
    sport:       { type: DataTypes.STRING(100), allowNull: false },
    position:    { type: DataTypes.STRING(100) },
    teamId:      { type: DataTypes.UUID },
    email:       { type: DataTypes.STRING(255), allowNull: false, unique: true },
    phone:       { type: DataTypes.STRING(50) },
    height:      { type: DataTypes.FLOAT },       // cm
    weight:      { type: DataTypes.FLOAT },       // kg
    nationality: { type: DataTypes.STRING(100) },
    status:      { type: DataTypes.ENUM("active", "injured", "suspended", "inactive", "retired"), defaultValue: "active" },
    notes:       { type: DataTypes.TEXT },
    deletedAt:   { type: DataTypes.DATE },        // soft-delete
  },
  { tableName: "athletes", timestamps: true }
);

const Performance = sequelize.define(
  "Performance",
  {
    id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    athleteId:  { type: DataTypes.UUID, allowNull: false },
    sessionId:  { type: DataTypes.UUID },
    metric:     { type: DataTypes.STRING(100), allowNull: false },
    value:      { type: DataTypes.FLOAT, allowNull: false },
    unit:       { type: DataTypes.STRING(50), allowNull: false },
    recordedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    notes:      { type: DataTypes.TEXT },
    tags:       { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  },
  { tableName: "performances", timestamps: true }
);

const Session = sequelize.define(
  "Session",
  {
    id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    title:           { type: DataTypes.STRING(255), allowNull: false },
    type:            { type: DataTypes.STRING(100), allowNull: false },
    coachId:         { type: DataTypes.UUID },
    location:        { type: DataTypes.STRING(255) },
    scheduledAt:     { type: DataTypes.DATE, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
    maxCapacity:     { type: DataTypes.INTEGER },
    status:          { type: DataTypes.ENUM("scheduled", "in_progress", "completed", "cancelled"), defaultValue: "scheduled" },
    notes:           { type: DataTypes.TEXT },
    goals:           { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  },
  { tableName: "sessions", timestamps: true }
);

const SessionAthlete = sequelize.define(
  "SessionAthlete",
  {
    id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sessionId:  { type: DataTypes.UUID, allowNull: false },
    athleteId:  { type: DataTypes.UUID, allowNull: false },
    enrolledAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "session_athletes", timestamps: false }
);

// ── Associations ───────────────────────────────────────────────────────────────

Athlete.hasMany(Performance, { foreignKey: "athleteId", as: "performances" });
Performance.belongsTo(Athlete, { foreignKey: "athleteId", as: "athlete" });

Session.hasMany(Performance, { foreignKey: "sessionId", as: "performances" });
Performance.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

Session.hasMany(SessionAthlete, { foreignKey: "sessionId", as: "enrollments" });
SessionAthlete.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

Athlete.hasMany(SessionAthlete, { foreignKey: "athleteId", as: "sessionEnrollments" });
SessionAthlete.belongsTo(Athlete, { foreignKey: "athleteId", as: "athlete" });

// Unique constraint: one athlete per session
SessionAthlete.addHook("beforeCreate", async (enrollment) => {
  const existing = await SessionAthlete.findOne({
    where: { sessionId: enrollment.sessionId, athleteId: enrollment.athleteId },
  });
  if (existing) throw new Error("Athlete is already enrolled in this session");
});

// ── Sync & Export ──────────────────────────────────────────────────────────────

const db = {
  sequelize,
  Sequelize,
  athletes: Athlete,
  performances: Performance,
  sessions: Session,
  sessionAthletes: SessionAthlete,
};

// Sync in development only — use migrations in production
if (process.env.NODE_ENV === "development") {
  sequelize.sync({ alter: true }).then(() => {
    console.log("✅ Database synced");
  });
}

module.exports = db;
