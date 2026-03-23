// ─────────────────────────────────────────────────────────────────────────────
// ComparisonTable.tsx – Side-by-side metric comparison with winner highlights
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { LeaderboardRow, MetricDefinition } from "./types";
import { ALL_METRICS } from "./athleteData";

interface ComparisonTableProps {
  rows: LeaderboardRow[];
  selectedMetricIds: string[];
}

type WinnerMap = Record<string, string>; // metricId → winning athleteId

function computeWinners(rows: LeaderboardRow[], metricIds: string[]): WinnerMap {
  const winners: WinnerMap = {};
  for (const metricId of metricIds) {
    const def = ALL_METRICS.find((m) => m.id === metricId);
    if (!def) continue;

    let bestVal: number | null = null;
    let bestId: string | null = null;

    for (const row of rows) {
      const val = row.rawValues[metricId];
      if (val === undefined) continue;
      if (
        bestVal === null ||
        (def.direction === "higher_is_better" ? val > bestVal : val < bestVal)
      ) {
        bestVal = val;
        bestId = row.athlete.id;
      }
    }

    if (bestId) winners[metricId] = bestId;
  }
  return winners;
}

function formatValue(value: number, metricId: string): string {
  const def = ALL_METRICS.find((m) => m.id === metricId);
  if (!def) return String(value);
  switch (def.unit) {
    case "seconds":
      if (metricId === "reaction_time") return `${(value * 1000).toFixed(0)} ms`;
      return `${value.toFixed(2)}s`;
    case "kg": return `${value} kg`;
    case "watts": return `${value} W`;
    case "bpm": return `${value} bpm`;
    case "km/h": return `${value} km/h`;
    case "%": return `${value}%`;
    default: return `${value}`;
  }
}

function ScoreBar({
  score,
  color,
  isWinner,
}: {
  score: number;
  color: string;
  isWinner: boolean;
}) {
  return (
    <div className={`cmp-bar-wrap ${isWinner ? "cmp-bar-wrap--winner" : ""}`}>
      <div className="cmp-bar-track">
        <div
          className="cmp-bar-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="cmp-bar-score" style={isWinner ? { color } : undefined}>
        {score}
      </span>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Speed: "#3b82f6",
  Strength: "#ef4444",
  Endurance: "#10b981",
  Recovery: "#8b5cf6",
  Technique: "#f59e0b",
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  rows,
  selectedMetricIds,
}) => {
  const [showNormalized, setShowNormalized] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const winners = computeWinners(rows, selectedMetricIds);

  const categories = Array.from(
    new Set(
      ALL_METRICS.filter((m) => selectedMetricIds.includes(m.id)).map((m) => m.category)
    )
  );

  const visibleMetrics = ALL_METRICS.filter(
    (m) =>
      selectedMetricIds.includes(m.id) &&
      (categoryFilter === "All" || m.category === categoryFilter)
  );

  if (rows.length === 0) {
    return (
      <div className="lb-empty">
        <span className="lb-empty__icon">⚖️</span>
        <p className="lb-empty__text">Select at least two athletes to compare.</p>
      </div>
    );
  }

  // Win-count per athlete (for header)
  const winCounts: Record<string, number> = {};
  Object.values(winners).forEach((athleteId) => {
    winCounts[athleteId] = (winCounts[athleteId] ?? 0) + 1;
  });

  return (
    <div className="cmp-wrapper">
      {/* Controls */}
      <div className="cmp-controls">
        <div className="cmp-controls__filters">
          <span className="cmp-controls__label">Category:</span>
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              className={`cmp-cat-btn ${categoryFilter === cat ? "cmp-cat-btn--active" : ""}`}
              style={
                cat !== "All" && categoryFilter === cat
                  ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] }
                  : undefined
              }
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <label className="cmp-toggle">
          <input
            type="checkbox"
            checked={showNormalized}
            onChange={(e) => setShowNormalized(e.target.checked)}
          />
          <span className="cmp-toggle__track" />
          <span className="cmp-toggle__label">Show normalized (0–100)</span>
        </label>
      </div>

      <div className="cmp-scroll">
        <table className="cmp-table" aria-label="Athlete Comparison">
          <thead>
            <tr>
              <th className="cmp-th cmp-th--metric">Metric</th>
              {rows.map((row) => {
                const wins = winCounts[row.athlete.id] ?? 0;
                return (
                  <th
                    key={row.athlete.id}
                    className="cmp-th cmp-th--athlete"
                    style={{ borderTopColor: row.athlete.accentColor }}
                  >
                    <div className="cmp-athlete-header">
                      <div
                        className="cmp-athlete-header__avatar"
                        style={{
                          backgroundColor: row.athlete.accentColor + "22",
                          color: row.athlete.accentColor,
                        }}
                      >
                        {row.athlete.avatarInitials}
                      </div>
                      <div className="cmp-athlete-header__info">
                        <span className="cmp-athlete-header__name">
                          {row.athlete.flagEmoji} {row.athlete.name}
                        </span>
                        <span className="cmp-athlete-header__sub">
                          {row.athlete.sport}
                        </span>
                      </div>
                      <div
                        className="cmp-athlete-header__rank"
                        style={{ color: row.athlete.accentColor }}
                      >
                        #{row.rank}
                      </div>
                    </div>

                    {/* Win bar */}
                    <div className="cmp-athlete-header__wins">
                      <span
                        className="cmp-athlete-header__wins-count"
                        style={{ color: row.athlete.accentColor }}
                      >
                        {wins}
                      </span>
                      <span className="cmp-athlete-header__wins-label">
                        {wins === 1 ? "win" : "wins"}
                      </span>
                    </div>

                    {/* Composite score bar */}
                    <div className="cmp-athlete-header__composite">
                      <div className="cmp-athlete-header__composite-track">
                        <div
                          className="cmp-athlete-header__composite-fill"
                          style={{
                            width: `${row.compositeScore}%`,
                            backgroundColor: row.athlete.accentColor,
                          }}
                        />
                      </div>
                      <span className="cmp-athlete-header__composite-label">
                        {row.compositeScore}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleMetrics.map((metric, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <tr
                  key={metric.id}
                  className={`cmp-row ${isEven ? "cmp-row--even" : ""}`}
                >
                  {/* Metric label */}
                  <td className="cmp-td cmp-td--metric">
                    <div className="cmp-metric-cell">
                      <span
                        className="cmp-metric-cell__cat-dot"
                        style={{ backgroundColor: CATEGORY_COLORS[metric.category] }}
                        title={metric.category}
                      />
                      <div className="cmp-metric-cell__info">
                        <span className="cmp-metric-cell__label">{metric.label}</span>
                        <span className="cmp-metric-cell__hint">
                          {metric.direction === "higher_is_better"
                            ? "↑ Higher wins"
                            : "↓ Lower wins"}
                          {" · "}
                          {metric.unit}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Athlete value cells */}
                  {rows.map((row) => {
                    const raw = row.rawValues[metric.id];
                    const norm = row.normalizedScores[metric.id];
                    const isWinner = winners[metric.id] === row.athlete.id;

                    if (raw === undefined) {
                      return (
                        <td key={row.athlete.id} className="cmp-td cmp-td--na">
                          —
                        </td>
                      );
                    }

                    return (
                      <td
                        key={row.athlete.id}
                        className={`cmp-td ${isWinner ? "cmp-td--winner" : ""}`}
                        style={isWinner ? { borderColor: row.athlete.accentColor + "88" } : undefined}
                      >
                        <div className="cmp-value-cell">
                          {isWinner && (
                            <span
                              className="cmp-winner-crown"
                              title="Best in this metric"
                              style={{ color: row.athlete.accentColor }}
                            >
                              ★
                            </span>
                          )}
                          <span
                            className={`cmp-value-cell__raw ${isWinner ? "cmp-value-cell__raw--winner" : ""}`}
                            style={isWinner ? { color: row.athlete.accentColor } : undefined}
                          >
                            {formatValue(raw, metric.id)}
                          </span>
                          <ScoreBar
                            score={norm}
                            color={row.athlete.accentColor}
                            isWinner={isWinner}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Composite row */}
            <tr className="cmp-row cmp-row--composite">
              <td className="cmp-td cmp-td--metric">
                <div className="cmp-metric-cell">
                  <span
                    className="cmp-metric-cell__cat-dot"
                    style={{ backgroundColor: "#6366f1" }}
                  />
                  <div className="cmp-metric-cell__info">
                    <span className="cmp-metric-cell__label cmp-metric-cell__label--composite">
                      Overall Score
                    </span>
                    <span className="cmp-metric-cell__hint">
                      Composite across all selected metrics
                    </span>
                  </div>
                </div>
              </td>
              {rows.map((row) => {
                const isTop =
                  row.rank ===
                  Math.min(...rows.map((r) => r.rank));
                return (
                  <td
                    key={row.athlete.id}
                    className={`cmp-td cmp-td--composite ${isTop ? "cmp-td--winner" : ""}`}
                    style={isTop ? { borderColor: row.athlete.accentColor + "88" } : undefined}
                  >
                    <div className="cmp-value-cell">
                      {isTop && (
                        <span
                          className="cmp-winner-crown"
                          style={{ color: row.athlete.accentColor }}
                        >
                          ★
                        </span>
                      )}
                      <span
                        className={`cmp-value-cell__composite ${isTop ? "cmp-value-cell__composite--winner" : ""}`}
                        style={isTop ? { color: row.athlete.accentColor } : undefined}
                      >
                        {row.compositeScore}
                      </span>
                      <ScoreBar
                        score={row.compositeScore}
                        color={row.athlete.accentColor}
                        isWinner={isTop}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
