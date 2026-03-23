// ─────────────────────────────────────────────────────────────────────────────
// types.ts – Shared TypeScript interfaces & enums
// ─────────────────────────────────────────────────────────────────────────────

export type Sport = "Athletics" | "Swimming" | "Cycling" | "Triathlon" | "Weightlifting";

export type MetricUnit =
  | "seconds"
  | "meters"
  | "kg"
  | "watts"
  | "bpm"
  | "km/h"
  | "%"
  | "score"
  | "reps";

export type MetricDirection = "lower_is_better" | "higher_is_better";

/** A single measurable metric definition */
export interface MetricDefinition {
  id: string;
  label: string;
  shortLabel: string;
  unit: MetricUnit;
  direction: MetricDirection;
  description: string;
  /** Value range for normalisation [min, max] */
  range: [number, number];
  category: "Speed" | "Strength" | "Endurance" | "Recovery" | "Technique";
}

/** One athlete's recorded value for a specific metric */
export interface MetricValue {
  metricId: string;
  value: number;
  /** Optional context / timestamp */
  recordedAt?: string;
  personalBest?: number;
}

/** Full athlete profile */
export interface Athlete {
  id: string;
  name: string;
  age: number;
  nationality: string;
  flagEmoji: string;
  sport: Sport;
  club: string;
  avatarInitials: string;
  /** Hex accent colour per athlete */
  accentColor: string;
  metrics: MetricValue[];
  /** Overall composite ranking score (0-100) */
  compositeScore?: number;
  rank?: number;
  previousRank?: number;
}

/** Computed row shown in the leaderboard */
export interface LeaderboardRow {
  athlete: Athlete;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  compositeScore: number;
  /** Normalised score per metric (0-100) */
  normalizedScores: Record<string, number>;
  /** Raw value per metric */
  rawValues: Record<string, number>;
  metricRanks: Record<string, number>;
}

/** State managed by useLeaderboard hook */
export interface LeaderboardState {
  athletes: Athlete[];
  selectedMetricIds: string[];
  selectedAthleteIds: string[];
  sortMetricId: string | "composite";
  sortDirection: "asc" | "desc";
  activeView: "leaderboard" | "comparison" | "radar";
  searchQuery: string;
  sportFilter: Sport | "All";
}

export interface LeaderboardActions {
  toggleMetric: (metricId: string) => void;
  toggleAthlete: (athleteId: string) => void;
  selectAllAthletes: () => void;
  clearAthletes: () => void;
  setSortMetric: (metricId: string | "composite") => void;
  toggleSortDirection: () => void;
  setActiveView: (view: LeaderboardState["activeView"]) => void;
  setSearchQuery: (q: string) => void;
  setSportFilter: (sport: Sport | "All") => void;
  resetFilters: () => void;
}

/** Radar chart data point */
export interface RadarDataPoint {
  metric: string;
  fullMark: number;
  [athleteId: string]: number | string;
}

/** Medal tier */
export type MedalTier = "gold" | "silver" | "bronze" | "none";

export function getMedalTier(rank: number): MedalTier {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "none";
}
