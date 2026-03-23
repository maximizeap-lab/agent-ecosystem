// ─────────────────────────────────────────────────────────────────────────────
// Performance Metrics – Core Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitive / shared ───────────────────────────────────────────────────────

export type UUID = string;
export type ISODateString = string; // e.g. "2024-07-15T09:30:00.000Z"

export type MetricCategory =
  | "speed"
  | "strength"
  | "endurance"
  | "flexibility"
  | "power"
  | "agility"
  | "recovery"
  | "custom";

export type MetricUnit =
  // speed
  | "m/s"
  | "km/h"
  | "mph"
  | "min/km"
  | "min/mile"
  // strength
  | "kg"
  | "lbs"
  | "N"
  | "Nm"
  // endurance / time
  | "seconds"
  | "minutes"
  | "hours"
  // distance
  | "meters"
  | "km"
  | "miles"
  // physiological
  | "bpm"
  | "VO2max"
  | "%"
  | "RPE" // Rate of Perceived Exertion (1-10)
  // power
  | "watts"
  // reps / sets
  | "reps"
  | "sets"
  // custom / dimensionless
  | "score"
  | "index"
  | "custom";

export type AggregationMethod = "last" | "avg" | "max" | "min" | "sum";

export type TrendDirection = "up" | "down" | "stable" | "insufficient_data";

// ── KPI Definition ────────────────────────────────────────────────────────────

export interface KPIDefinition {
  id: UUID;
  name: string;
  description?: string;
  category: MetricCategory;
  unit: MetricUnit;
  customUnit?: string; // used when unit === "custom"
  aggregation: AggregationMethod;
  /** Lower is better (e.g. recovery time) */
  lowerIsBetter: boolean;
  /** Acceptable value range for validation */
  validRange?: { min: number; max: number };
  /** Target / goal value */
  target?: number;
  /** Whether this KPI is user-defined or system-defined */
  isCustom: boolean;
  /** Tags for filtering / grouping */
  tags?: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ── Metric Reading ────────────────────────────────────────────────────────────

export interface MetricReading {
  id: UUID;
  kpiId: UUID;
  sessionId: UUID;
  athleteId: UUID;
  value: number;
  /** Secondary breakdown values, e.g. left/right leg, set-by-set */
  breakdown?: Record<string, number>;
  notes?: string;
  /** Was this value manually overridden / edited after initial entry? */
  isEdited: boolean;
  /** Source of reading */
  source: "manual" | "device" | "calculated" | "imported";
  recordedAt: ISODateString;
  createdAt: ISODateString;
}

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionStatus = "planned" | "active" | "completed" | "cancelled";

export type SessionType =
  | "training"
  | "competition"
  | "recovery"
  | "testing"
  | "warmup"
  | "cooldown"
  | "custom";

export interface SessionEnvironment {
  temperature?: number; // Celsius
  humidity?: number; // %
  altitude?: number; // meters
  surface?: string; // e.g. "grass", "track", "gym"
  indoorOutdoor?: "indoor" | "outdoor";
}

export interface PerformanceSession {
  id: UUID;
  athleteId: UUID;
  coachId?: UUID;
  title: string;
  description?: string;
  type: SessionType;
  status: SessionStatus;
  scheduledAt: ISODateString;
  startedAt?: ISODateString;
  completedAt?: ISODateString;
  durationMinutes?: number;
  environment?: SessionEnvironment;
  /** Which KPIs are planned / enabled for this session */
  kpiIds: UUID[];
  /** RPE at end of session */
  overallRPE?: number;
  /** Coach rating 1-10 */
  coachRating?: number;
  tags?: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ── Session Log (aggregate of readings) ───────────────────────────────────────

export interface SessionLog {
  session: PerformanceSession;
  readings: MetricReading[];
  /** Computed summaries keyed by kpiId */
  summaries: Record<UUID, MetricSummary>;
}

// ── Computed / Analytics ──────────────────────────────────────────────────────

export interface MetricSummary {
  kpiId: UUID;
  kpiName: string;
  unit: MetricUnit;
  customUnit?: string;
  readings: number[];
  count: number;
  latest: number;
  avg: number;
  max: number;
  min: number;
  sum: number;
  stdDev: number;
  /** % change vs previous equivalent session */
  deltaPercent?: number;
  trend: TrendDirection;
  targetDelta?: number; // value - target
  targetAchieved?: boolean;
}

export interface AthleteProgressRecord {
  athleteId: UUID;
  kpiId: UUID;
  kpiName: string;
  unit: MetricUnit;
  customUnit?: string;
  history: Array<{
    sessionId: UUID;
    sessionTitle: string;
    date: ISODateString;
    value: number;
    aggregatedValue: number;
  }>;
  trend: TrendDirection;
  personalBest?: number;
  personalBestDate?: ISODateString;
  recentAvg?: number;
}

// ── Input / Form DTOs ─────────────────────────────────────────────────────────

export interface CreateKPIInput {
  name: string;
  description?: string;
  category: MetricCategory;
  unit: MetricUnit;
  customUnit?: string;
  aggregation: AggregationMethod;
  lowerIsBetter: boolean;
  validRange?: { min: number; max: number };
  target?: number;
  tags?: string[];
}

export interface UpdateKPIInput extends Partial<CreateKPIInput> {
  id: UUID;
}

export interface CreateSessionInput {
  athleteId: UUID;
  coachId?: UUID;
  title: string;
  description?: string;
  type: SessionType;
  scheduledAt: ISODateString;
  kpiIds: UUID[];
  environment?: SessionEnvironment;
  tags?: string[];
}

export interface LogMetricInput {
  kpiId: UUID;
  sessionId: UUID;
  athleteId: UUID;
  value: number;
  breakdown?: Record<string, number>;
  notes?: string;
  source?: MetricReading["source"];
  recordedAt?: ISODateString;
}

export interface BulkLogMetricsInput {
  sessionId: UUID;
  athleteId: UUID;
  readings: Array<Omit<LogMetricInput, "sessionId" | "athleteId">>;
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

// ── Filter / Query ────────────────────────────────────────────────────────────

export interface MetricQueryFilter {
  athleteId?: UUID;
  sessionId?: UUID;
  kpiIds?: UUID[];
  categories?: MetricCategory[];
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
  source?: MetricReading["source"];
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SessionQueryFilter {
  athleteId?: UUID;
  coachId?: UUID;
  status?: SessionStatus[];
  types?: SessionType[];
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
  tags?: string[];
  limit?: number;
  offset?: number;
}
