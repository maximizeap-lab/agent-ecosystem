// ─────────────────────────────────────────────────────────────────────────────
// RadarChart.tsx – Pure SVG spider/radar chart (no external chart library)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import { LeaderboardRow, RadarDataPoint } from "./types";

interface RadarChartProps {
  data: RadarDataPoint[];
  rows: LeaderboardRow[];
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 480;
const LEVELS = 5; // concentric polygon rings
const PADDING = 80; // space for axis labels

interface Point {
  x: number;
  y: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleRad: number
): Point {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

function pointsToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  rows,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}) => {
  const [hoveredAthlete, setHoveredAthlete] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    athleteId: string;
    metric: string;
    value: number;
  } | null>(null);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - PADDING;

  const numAxes = data.length;
  if (numAxes === 0 || rows.length === 0) {
    return (
      <div className="radar-empty">
        <span className="radar-empty__icon">🕸️</span>
        <p>Select metrics and athletes to render chart</p>
      </div>
    );
  }

  const angleStep = (2 * Math.PI) / numAxes;

  // ── Grid polygons ──────────────────────────────────────────────────────────
  const gridPolygons = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = (radius * (lvl + 1)) / LEVELS;
    const points = data.map((_, i) => polarToCartesian(cx, cy, r, i * angleStep));
    return { path: pointsToPath(points), level: lvl + 1 };
  });

  // ── Axis lines + labels ────────────────────────────────────────────────────
  const axes = data.map((d, i) => {
    const angle = i * angleStep;
    const outerPt = polarToCartesian(cx, cy, radius, angle);
    const labelPt = polarToCartesian(cx, cy, radius + 28, angle);
    return { axis: d.metric, outerPt, labelPt, angle };
  });

  // ── Athlete polygons ───────────────────────────────────────────────────────
  const athletePolygons = rows.map((row) => {
    const points = data.map((d, i) => {
      const val = (d[row.athlete.id] as number) ?? 0;
      const r = (val / 100) * radius;
      return polarToCartesian(cx, cy, r, i * angleStep);
    });

    const isHovered = hoveredAthlete === row.athlete.id;
    const isOtherHovered = hoveredAthlete !== null && !isHovered;

    return {
      athlete: row.athlete,
      path: pointsToPath(points),
      points,
      isHovered,
      isOtherHovered,
    };
  });

  const handleMouseEnterPoly = useCallback((athleteId: string) => {
    setHoveredAthlete(athleteId);
  }, []);

  const handleMouseLeavePoly = useCallback(() => {
    setHoveredAthlete(null);
    setTooltip(null);
  }, []);

  const handleMouseEnterDot = useCallback(
    (
      e: React.MouseEvent<SVGCircleElement>,
      athleteId: string,
      metric: string,
      value: number
    ) => {
      const rect = (e.target as SVGCircleElement)
        .closest("svg")!
        .getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        athleteId,
        metric,
        value,
      });
    },
    []
  );

  // ── Level labels ────────────────────────────────────────────────────────────
  const levelLabels = Array.from({ length: LEVELS }, (_, lvl) => {
    const r = (radius * (lvl + 1)) / LEVELS;
    const pt = polarToCartesian(cx, cy, r, 0); // top axis direction
    return { y: pt.y, label: `${((lvl + 1) * 100) / LEVELS}` };
  });

  return (
    <div className="radar-wrapper">
      <div className="radar-svg-container" style={{ width, height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="radar-svg"
          aria-label="Radar chart comparing athletes across metrics"
          role="img"
        >
          {/* Background */}
          <rect width={width} height={height} fill="transparent" />

          {/* Grid polygons */}
          {gridPolygons.map(({ path, level }) => (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={level === LEVELS ? 1.5 : 0.75}
              strokeDasharray={level === LEVELS ? "none" : "4,3"}
              opacity={0.5}
            />
          ))}

          {/* Level value labels */}
          {levelLabels.map(({ y, label }) => (
            <text
              key={label}
              x={cx + 4}
              y={y}
              fontSize={9}
              fill="var(--color-text-muted)"
              dominantBaseline="middle"
            >
              {label}
            </text>
          ))}

          {/* Axis lines */}
          {axes.map(({ axis, outerPt, labelPt, angle }) => (
            <g key={axis}>
              <line
                x1={cx}
                y1={cy}
                x2={outerPt.x}
                y2={outerPt.y}
                stroke="var(--color-border)"
                strokeWidth={1}
                opacity={0.6}
              />
              {/* Label */}
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor={
                  Math.abs(labelPt.x - cx) < 5
                    ? "middle"
                    : labelPt.x > cx
                    ? "start"
                    : "end"
                }
                dominantBaseline={labelPt.y < cy ? "auto" : "hanging"}
                fontSize={11}
                fontWeight={600}
                fill="var(--color-text-secondary)"
                className="radar-axis-label"
              >
                {axis}
              </text>
            </g>
          ))}

          {/* Center dot */}
          <circle cx={cx} cy={cy} r={3} fill="var(--color-border)" />

          {/* Athlete polygons (non-hovered first) */}
          {athletePolygons
            .filter((p) => !p.isHovered)
            .map(({ athlete, path, points, isOtherHovered }) => (
              <g
                key={athlete.id}
                onMouseEnter={() => handleMouseEnterPoly(athlete.id)}
                onMouseLeave={handleMouseLeavePoly}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={path}
                  fill={athlete.accentColor + "28"}
                  stroke={athlete.accentColor}
                  strokeWidth={1.5}
                  opacity={isOtherHovered ? 0.2 : 0.85}
                  style={{ transition: "opacity 0.2s" }}
                />
                {/* Data dots */}
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={3}
                    fill={athlete.accentColor}
                    opacity={isOtherHovered ? 0.1 : 0.9}
                    onMouseEnter={(e) =>
                      handleMouseEnterDot(
                        e,
                        athlete.id,
                        data[i].metric,
                        (data[i][athlete.id] as number) ?? 0
                      )
                    }
                  />
                ))}
              </g>
            ))}

          {/* Hovered polygon rendered on top */}
          {athletePolygons
            .filter((p) => p.isHovered)
            .map(({ athlete, path, points }) => (
              <g
                key={athlete.id}
                onMouseLeave={handleMouseLeavePoly}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={path}
                  fill={athlete.accentColor + "45"}
                  stroke={athlete.accentColor}
                  strokeWidth={2.5}
                  opacity={1}
                  style={{ filter: `drop-shadow(0 0 4px ${athlete.accentColor}88)` }}
                />
                {points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={5}
                    fill={athlete.accentColor}
                    stroke="white"
                    strokeWidth={1.5}
                    onMouseEnter={(e) =>
                      handleMouseEnterDot(
                        e,
                        athlete.id,
                        data[i].metric,
                        (data[i][athlete.id] as number) ?? 0
                      )
                    }
                  />
                ))}
              </g>
            ))}

          {/* SVG Tooltip */}
          {tooltip && (() => {
            const row = rows.find((r) => r.athlete.id === tooltip.athleteId);
            if (!row) return null;
            const boxW = 130;
            const boxH = 52;
            const bx = Math.min(tooltip.x + 10, width - boxW - 8);
            const by = Math.min(tooltip.y - boxH - 8, height - boxH - 8);
            return (
              <g className="radar-tooltip-svg">
                <rect
                  x={bx}
                  y={by}
                  width={boxW}
                  height={boxH}
                  rx={6}
                  fill="var(--color-surface)"
                  stroke={row.athlete.accentColor}
                  strokeWidth={1.5}
                  opacity={0.97}
                />
                <text
                  x={bx + 8}
                  y={by + 15}
                  fontSize={10}
                  fontWeight={700}
                  fill={row.athlete.accentColor}
                >
                  {row.athlete.name}
                </text>
                <text
                  x={bx + 8}
                  y={by + 28}
                  fontSize={10}
                  fill="var(--color-text-secondary)"
                >
                  {tooltip.metric}
                </text>
                <text
                  x={bx + 8}
                  y={by + 43}
                  fontSize={11}
                  fontWeight={600}
                  fill="var(--color-text-primary)"
                >
                  Score: {tooltip.value}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="radar-legend">
        {rows.map((row) => (
          <button
            key={row.athlete.id}
            className={`radar-legend__item ${hoveredAthlete === row.athlete.id ? "radar-legend__item--active" : ""} ${hoveredAthlete !== null && hoveredAthlete !== row.athlete.id ? "radar-legend__item--dim" : ""}`}
            onMouseEnter={() => setHoveredAthlete(row.athlete.id)}
            onMouseLeave={() => setHoveredAthlete(null)}
            style={
              hoveredAthlete === row.athlete.id
                ? { borderColor: row.athlete.accentColor, backgroundColor: row.athlete.accentColor + "15" }
                : undefined
            }
          >
            <span
              className="radar-legend__swatch"
              style={{ backgroundColor: row.athlete.accentColor }}
            />
            <span className="radar-legend__flag">{row.athlete.flagEmoji}</span>
            <span className="radar-legend__name">{row.athlete.name}</span>
            <span
              className="radar-legend__score"
              style={{ color: row.athlete.accentColor }}
            >
              {row.compositeScore}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
