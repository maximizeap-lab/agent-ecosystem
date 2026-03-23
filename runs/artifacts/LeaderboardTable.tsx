// ─────────────────────────────────────────────────────────────────────────────
// LeaderboardTable.tsx – Ranked table with sortable columns & metric scores
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { LeaderboardRow, MetricDefinition, getMedalTier } from "./types";
import { ALL_METRICS } from "./athleteData";

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
  selectedMetricIds: string[];
  sortMetricId: string | "composite";
  sortDirection: "asc" | "desc";
  onSortChange: (metricId: string | "composite") => void;
  onToggleSortDirection: () => void;
}

const MEDAL_EMOJIS = { gold: "🥇", silver: "🥈", bronze: "🥉", none: "" };

/** Score → colour: red 0–39, amber 40–69, green 70–100 */
function scoreColorClass(score: number): string {
  if (score >= 80) return "score--excellent";
  if (score >= 65) return "score--good";
  if (score >= 45) return "score--average";
  return "score--poor";
}

function formatValue(value: number, metricId: string): string {
  const def = ALL_METRICS.find((m) => m.id === metricId);
  if (!def) return String(value);

  switch (def.unit) {
    case "seconds":
      if (metricId === "reaction_time") return `${(value * 1000).toFixed(0)} ms`;
      return `${value.toFixed(2)}s`;
    case "kg":
      return `${value} kg`;
    case "watts":
      return `${value} W`;
    case "bpm":
      return `${value} bpm`;
    case "km/h":
      return `${value} km/h`;
    case "%":
      return `${value}%`;
    case "score":
      return `${value}`;
    case "reps":
      return `${value} reps`;
    default:
      return String(value);
  }
}

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0)
    return <span className="rank-delta rank-delta--neutral">—</span>;
  if (delta > 0)
    return (
      <span className="rank-delta rank-delta--up" aria-label={`Up ${delta}`}>
        ▲{delta}
      </span>
    );
  return (
    <span className="rank-delta rank-delta--down" aria-label={`Down ${Math.abs(delta)}`}>
      ▼{Math.abs(delta)}
    </span>
  );
}

interface SortableHeaderProps {
  label: string;
  metricId: string | "composite";
  currentSortId: string | "composite";
  direction: "asc" | "desc";
  onClick: () => void;
  hint?: string;
}

function SortableHeader({
  label,
  metricId,
  currentSortId,
  direction,
  onClick,
  hint,
}: SortableHeaderProps) {
  const active = currentSortId === metricId;
  return (
    <th
      className={`lb-th lb-th--sortable ${active ? "lb-th--active" : ""}`}
      onClick={onClick}
      title={hint}
      aria-sort={active ? (direction === "desc" ? "descending" : "ascending") : "none"}
    >
      <span className="lb-th__inner">
        <span className="lb-th__label">{label}</span>
        <span className={`lb-th__arrow ${active ? "lb-th__arrow--active" : ""}`}>
          {active ? (direction === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </span>
    </th>
  );
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  rows,
  selectedMetricIds,
  sortMetricId,
  sortDirection,
  onSortChange,
  onToggleSortDirection,
}) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleHeaderClick = (metricId: string | "composite") => {
    if (sortMetricId === metricId) {
      onToggleSortDirection();
    } else {
      onSortChange(metricId);
    }
  };

  const selectedMetrics = selectedMetricIds
    .map((id) => ALL_METRICS.find((m) => m.id === id))
    .filter(Boolean) as MetricDefinition[];

  if (rows.length === 0) {
    return (
      <div className="lb-empty">
        <span className="lb-empty__icon">🏅</span>
        <p className="lb-empty__text">No athletes match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="lb-wrapper">
      <div className="lb-scroll">
        <table className="lb-table" aria-label="Athlete Leaderboard">
          <thead>
            <tr>
              {/* Fixed columns */}
              <th className="lb-th lb-th--rank" aria-label="Rank">
                #
              </th>
              <th className="lb-th lb-th--trend" aria-label="Trend">
                Δ
              </th>
              <th className="lb-th lb-th--athlete">Athlete</th>
              <SortableHeader
                label="Score"
                metricId="composite"
                currentSortId={sortMetricId}
                direction={sortDirection}
                onClick={() => handleHeaderClick("composite")}
                hint="Composite score across selected metrics"
              />

              {/* Dynamic metric columns */}
              {selectedMetrics.map((metric) => (
                <SortableHeader
                  key={metric.id}
                  label={metric.shortLabel}
                  metricId={metric.id}
                  currentSortId={sortMetricId}
                  direction={sortDirection}
                  onClick={() => handleHeaderClick(metric.id)}
                  hint={`${metric.label} (${metric.unit}) — ${metric.direction === "higher_is_better" ? "↑ higher is better" : "↓ lower is better"}`}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const { athlete, rank, rankDelta, compositeScore, normalizedScores, rawValues, metricRanks } = row;
              const medal = getMedalTier(rank);
              const isExpanded = expandedRow === athlete.id;

              return (
                <React.Fragment key={athlete.id}>
                  <tr
                    className={`lb-row lb-row--medal-${medal} ${isExpanded ? "lb-row--expanded" : ""}`}
                    style={{ "--athlete-accent": athlete.accentColor } as React.CSSProperties}
                    onClick={() => setExpandedRow(isExpanded ? null : athlete.id)}
                    role="button"
                    aria-expanded={isExpanded}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setExpandedRow(isExpanded ? null : athlete.id);
                    }}
                  >
                    {/* Rank */}
                    <td className="lb-td lb-td--rank">
                      <div className={`rank-badge rank-badge--${medal}`}>
                        {medal !== "none" ? (
                          <span aria-label={`${medal} medal`}>
                            {MEDAL_EMOJIS[medal]}
                          </span>
                        ) : (
                          <span className="rank-badge__number">{rank}</span>
                        )}
                      </div>
                    </td>

                    {/* Trend */}
                    <td className="lb-td lb-td--trend">
                      <RankDelta delta={rankDelta} />
                    </td>

                    {/* Athlete */}
                    <td className="lb-td lb-td--athlete">
                      <div className="lb-athlete">
                        <div
                          className="lb-athlete__avatar"
                          style={{
                            backgroundColor: athlete.accentColor + "22",
                            color: athlete.accentColor,
                            borderColor: athlete.accentColor,
                          }}
                        >
                          {athlete.avatarInitials}
                        </div>
                        <div className="lb-athlete__info">
                          <div className="lb-athlete__name">
                            <span className="lb-athlete__flag">{athlete.flagEmoji}</span>
                            {athlete.name}
                          </div>
                          <div className="lb-athlete__sub">
                            {athlete.sport} · {athlete.club}
                          </div>
                        </div>
                        <span className="lb-row__expand-icon" aria-hidden="true">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </td>

                    {/* Composite score */}
                    <td className="lb-td lb-td--composite">
                      <div className="composite-cell">
                        <div className="composite-cell__bar-bg">
                          <div
                            className="composite-cell__bar"
                            style={{
                              width: `${compositeScore}%`,
                              backgroundColor: athlete.accentColor,
                            }}
                          />
                        </div>
                        <span className={`composite-cell__value ${scoreColorClass(compositeScore)}`}>
                          {compositeScore}
                        </span>
                      </div>
                    </td>

                    {/* Metric columns */}
                    {selectedMetrics.map((metric) => {
                      const raw = rawValues[metric.id];
                      const norm = normalizedScores[metric.id];
                      const mRank = metricRanks[metric.id];
                      if (raw === undefined) {
                        return (
                          <td key={metric.id} className="lb-td lb-td--metric lb-td--na">
                            N/A
                          </td>
                        );
                      }
                      return (
                        <td key={metric.id} className="lb-td lb-td--metric">
                          <div className="metric-cell">
                            <span className="metric-cell__raw">
                              {formatValue(raw, metric.id)}
                            </span>
                            <div className="metric-cell__footer">
                              <span className={`metric-cell__norm ${scoreColorClass(norm)}`}>
                                {norm}
                              </span>
                              <span className="metric-cell__rank">#{mRank}</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="lb-detail-row">
                      <td colSpan={4 + selectedMetrics.length} className="lb-detail-cell">
                        <div className="lb-detail">
                          <div className="lb-detail__grid">
                            <div className="lb-detail__item">
                              <span className="lb-detail__key">Age</span>
                              <span className="lb-detail__val">{athlete.age}</span>
                            </div>
                            <div className="lb-detail__item">
                              <span className="lb-detail__key">Nationality</span>
                              <span className="lb-detail__val">
                                {athlete.flagEmoji} {athlete.nationality}
                              </span>
                            </div>
                            <div className="lb-detail__item">
                              <span className="lb-detail__key">Club</span>
                              <span className="lb-detail__val">{athlete.club}</span>
                            </div>
                            <div className="lb-detail__item">
                              <span className="lb-detail__key">Composite</span>
                              <span className="lb-detail__val">{compositeScore}/100</span>
                            </div>
                          </div>

                          {/* Per-metric personal bests */}
                          <div className="lb-detail__pbs">
                            {selectedMetrics.map((metric) => {
                              const entry = athlete.metrics.find(
                                (m) => m.metricId === metric.id
                              );
                              return (
                                <div key={metric.id} className="lb-detail__pb">
                                  <span className="lb-detail__pb-label">
                                    {metric.shortLabel}
                                  </span>
                                  <span className="lb-detail__pb-val">
                                    {entry ? formatValue(entry.value, metric.id) : "—"}
                                  </span>
                                  {entry?.personalBest && (
                                    <span className="lb-detail__pb-best">
                                      PB: {formatValue(entry.personalBest, metric.id)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="lb-legend">
        <div className="lb-legend__item">
          <span className="lb-legend__swatch score--excellent" />
          Excellent (80+)
        </div>
        <div className="lb-legend__item">
          <span className="lb-legend__swatch score--good" />
          Good (65–79)
        </div>
        <div className="lb-legend__item">
          <span className="lb-legend__swatch score--average" />
          Average (45–64)
        </div>
        <div className="lb-legend__item">
          <span className="lb-legend__swatch score--poor" />
          Below avg (&lt;45)
        </div>
        <div className="lb-legend__item lb-legend__item--tip">
          💡 Click any row to expand details
        </div>
      </div>
    </div>
  );
};
