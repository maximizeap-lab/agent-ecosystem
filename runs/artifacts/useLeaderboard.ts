// ─────────────────────────────────────────────────────────────────────────────
// useLeaderboard.ts – Core hook: scoring, normalisation, sorting, filtering
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from "react";
import {
  Athlete,
  LeaderboardRow,
  LeaderboardState,
  LeaderboardActions,
  RadarDataPoint,
  Sport,
} from "./types";
import {
  ALL_ATHLETES,
  ALL_METRICS,
  DEFAULT_SELECTED_METRICS,
  DEFAULT_SELECTED_ATHLETES,
} from "./athleteData";

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Normalise a raw metric value to 0–100 where 100 = best possible.
 * Handles both lower_is_better and higher_is_better directions.
 */
function normaliseValue(value: number, metricId: string): number {
  const def = ALL_METRICS.find((m) => m.id === metricId);
  if (!def) return 0;

  const [min, max] = def.range;
  const clamped = Math.max(min, Math.min(max, value));
  const fraction = (clamped - min) / (max - min); // 0 = min, 1 = max

  const score = def.direction === "higher_is_better" ? fraction * 100 : (1 - fraction) * 100;
  return Math.round(score * 10) / 10;
}

/**
 * Compute composite score = simple arithmetic mean of normalised scores
 * across the currently selected metrics.
 */
function computeCompositeScore(
  athlete: Athlete,
  selectedMetricIds: string[]
): number {
  if (selectedMetricIds.length === 0) return 0;

  let total = 0;
  let counted = 0;

  for (const metricId of selectedMetricIds) {
    const entry = athlete.metrics.find((m) => m.metricId === metricId);
    if (entry !== undefined) {
      total += normaliseValue(entry.value, metricId);
      counted++;
    }
  }

  if (counted === 0) return 0;
  return Math.round((total / counted) * 10) / 10;
}

/**
 * Rank athletes within the selected cohort for a specific metric.
 * Returns a map of athleteId → rank (1-based).
 */
function computeMetricRanks(
  athletes: Athlete[],
  metricId: string
): Record<string, number> {
  const def = ALL_METRICS.find((m) => m.id === metricId);
  if (!def) return {};

  const pairs = athletes
    .map((a) => ({
      id: a.id,
      value: a.metrics.find((m) => m.metricId === metricId)?.value ?? null,
    }))
    .filter((p) => p.value !== null) as { id: string; value: number }[];

  const sorted = [...pairs].sort((a, b) =>
    def.direction === "higher_is_better" ? b.value - a.value : a.value - b.value
  );

  const ranks: Record<string, number> = {};
  sorted.forEach((p, idx) => {
    ranks[p.id] = idx + 1;
  });

  return ranks;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLeaderboard(): LeaderboardState & LeaderboardActions & {
  leaderboardRows: LeaderboardRow[];
  filteredAthletes: Athlete[];
  radarData: RadarDataPoint[];
  allMetrics: typeof ALL_METRICS;
  allAthletes: typeof ALL_ATHLETES;
} {
  const [state, setState] = useState<LeaderboardState>({
    athletes: ALL_ATHLETES,
    selectedMetricIds: DEFAULT_SELECTED_METRICS,
    selectedAthleteIds: DEFAULT_SELECTED_ATHLETES,
    sortMetricId: "composite",
    sortDirection: "desc",
    activeView: "leaderboard",
    searchQuery: "",
    sportFilter: "All",
  });

  // ── Derived: filtered athlete list ─────────────────────────────────────────
  const filteredAthletes = useMemo(() => {
    return state.athletes.filter((a) => {
      const matchesSearch =
        state.searchQuery === "" ||
        a.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        a.nationality.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        a.club.toLowerCase().includes(state.searchQuery.toLowerCase());

      const matchesSport =
        state.sportFilter === "All" || a.sport === state.sportFilter;

      const isSelected = state.selectedAthleteIds.includes(a.id);

      return matchesSearch && matchesSport && isSelected;
    });
  }, [state.athletes, state.searchQuery, state.sportFilter, state.selectedAthleteIds]);

  // ── Derived: leaderboard rows ──────────────────────────────────────────────
  const leaderboardRows = useMemo((): LeaderboardRow[] => {
    const { selectedMetricIds, sortMetricId, sortDirection } = state;

    // Pre-compute metric ranks for all filtered athletes
    const allMetricRankMaps: Record<string, Record<string, number>> = {};
    for (const metricId of selectedMetricIds) {
      allMetricRankMaps[metricId] = computeMetricRanks(filteredAthletes, metricId);
    }

    // Build base rows
    const rows: Omit<LeaderboardRow, "rank" | "previousRank" | "rankDelta">[] =
      filteredAthletes.map((athlete) => {
        const normalizedScores: Record<string, number> = {};
        const rawValues: Record<string, number> = {};
        const metricRanks: Record<string, number> = {};

        for (const metricId of selectedMetricIds) {
          const entry = athlete.metrics.find((m) => m.metricId === metricId);
          if (entry) {
            normalizedScores[metricId] = normaliseValue(entry.value, metricId);
            rawValues[metricId] = entry.value;
            metricRanks[metricId] = allMetricRankMaps[metricId][athlete.id] ?? 99;
          }
        }

        const compositeScore = computeCompositeScore(athlete, selectedMetricIds);

        return { athlete, compositeScore, normalizedScores, rawValues, metricRanks };
      });

    // Sort
    const sorted = [...rows].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortMetricId === "composite") {
        aVal = a.compositeScore;
        bVal = b.compositeScore;
      } else {
        const metricDef = ALL_METRICS.find((m) => m.id === sortMetricId);
        aVal = a.rawValues[sortMetricId] ?? 0;
        bVal = b.rawValues[sortMetricId] ?? 0;

        // For lower_is_better metrics, flip for display ranking
        if (metricDef?.direction === "lower_is_better") {
          [aVal, bVal] = [bVal, aVal];
        }
      }

      return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Assign ranks with previous rank simulation (±2 random delta for demo)
    return sorted.map((row, idx) => {
      const rank = idx + 1;
      // Simulate previous rank using athlete index offset for demo purposes
      const simulatedPrevious =
        row.athlete.previousRank ??
        Math.max(1, rank + (Math.floor(parseInt(row.athlete.id.replace("a", "")) * 1.3) % 3) - 1);
      const rankDelta = simulatedPrevious - rank;

      return {
        ...row,
        rank,
        previousRank: simulatedPrevious,
        rankDelta,
      };
    });
  }, [filteredAthletes, state.selectedMetricIds, state.sortMetricId, state.sortDirection]);

  // ── Derived: radar chart data ──────────────────────────────────────────────
  const radarData = useMemo((): RadarDataPoint[] => {
    return state.selectedMetricIds.map((metricId) => {
      const def = ALL_METRICS.find((m) => m.id === metricId)!;
      const point: RadarDataPoint = {
        metric: def.shortLabel,
        fullMark: 100,
      };

      for (const row of leaderboardRows) {
        point[row.athlete.id] = row.normalizedScores[metricId] ?? 0;
      }

      return point;
    });
  }, [leaderboardRows, state.selectedMetricIds]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleMetric = useCallback((metricId: string) => {
    setState((prev) => {
      const exists = prev.selectedMetricIds.includes(metricId);
      if (exists && prev.selectedMetricIds.length === 1) return prev; // keep at least 1
      return {
        ...prev,
        selectedMetricIds: exists
          ? prev.selectedMetricIds.filter((id) => id !== metricId)
          : [...prev.selectedMetricIds, metricId],
      };
    });
  }, []);

  const toggleAthlete = useCallback((athleteId: string) => {
    setState((prev) => {
      const exists = prev.selectedAthleteIds.includes(athleteId);
      if (exists && prev.selectedAthleteIds.length === 2) return prev; // keep at least 2
      return {
        ...prev,
        selectedAthleteIds: exists
          ? prev.selectedAthleteIds.filter((id) => id !== athleteId)
          : [...prev.selectedAthleteIds, athleteId],
      };
    });
  }, []);

  const selectAllAthletes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedAthleteIds: ALL_ATHLETES.map((a) => a.id),
    }));
  }, []);

  const clearAthletes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      // keep first 2 selected
      selectedAthleteIds: ALL_ATHLETES.slice(0, 2).map((a) => a.id),
    }));
  }, []);

  const setSortMetric = useCallback((metricId: string | "composite") => {
    setState((prev) => ({
      ...prev,
      sortMetricId: metricId,
      // When clicking same column, keep direction; otherwise default to desc
      sortDirection: prev.sortMetricId === metricId ? prev.sortDirection : "desc",
    }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      sortDirection: prev.sortDirection === "desc" ? "asc" : "desc",
    }));
  }, []);

  const setActiveView = useCallback((view: LeaderboardState["activeView"]) => {
    setState((prev) => ({ ...prev, activeView: view }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setState((prev) => ({ ...prev, searchQuery: q }));
  }, []);

  const setSportFilter = useCallback((sport: Sport | "All") => {
    setState((prev) => ({ ...prev, sportFilter: sport }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedMetricIds: DEFAULT_SELECTED_METRICS,
      selectedAthleteIds: DEFAULT_SELECTED_ATHLETES,
      sortMetricId: "composite",
      sortDirection: "desc",
      searchQuery: "",
      sportFilter: "All",
    }));
  }, []);

  return {
    ...state,
    leaderboardRows,
    filteredAthletes,
    radarData,
    allMetrics: ALL_METRICS,
    allAthletes: ALL_ATHLETES,
    toggleMetric,
    toggleAthlete,
    selectAllAthletes,
    clearAthletes,
    setSortMetric,
    toggleSortDirection,
    setActiveView,
    setSearchQuery,
    setSportFilter,
    resetFilters,
  };
}

// ── Exported pure utility for use in components ───────────────────────────────

export { normaliseValue, computeCompositeScore };
