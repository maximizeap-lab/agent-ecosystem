// ─────────────────────────────────────────────────────────────────────────────
// MetricSelector.tsx – Pill-based metric selection panel with category grouping
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { MetricDefinition } from "./types";

interface MetricSelectorProps {
  allMetrics: MetricDefinition[];
  selectedMetricIds: string[];
  onToggle: (metricId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  Speed: "⚡",
  Strength: "💪",
  Endurance: "🫀",
  Recovery: "🔄",
  Technique: "🎯",
};

const CATEGORY_COLORS: Record<string, string> = {
  Speed: "metric-cat--speed",
  Strength: "metric-cat--strength",
  Endurance: "metric-cat--endurance",
  Recovery: "metric-cat--recovery",
  Technique: "metric-cat--technique",
};

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  allMetrics,
  selectedMetricIds,
  onToggle,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Speed", "Strength", "Endurance", "Recovery", "Technique"])
  );
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const categories = Array.from(new Set(allMetrics.map((m) => m.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectedCount = selectedMetricIds.length;

  return (
    <div className="metric-selector">
      {/* Header */}
      <div className="metric-selector__header">
        <div className="metric-selector__title-row">
          <span className="metric-selector__icon">📊</span>
          <h3 className="metric-selector__title">Metrics</h3>
          <span className="metric-selector__badge">{selectedCount} selected</span>
        </div>
        <p className="metric-selector__hint">Select metrics to include in scoring</p>
      </div>

      {/* Category groups */}
      <div className="metric-selector__groups">
        {categories.map((category) => {
          const metricsInCat = allMetrics.filter((m) => m.category === category);
          const isExpanded = expandedCategories.has(category);
          const selectedInCat = metricsInCat.filter((m) =>
            selectedMetricIds.includes(m.id)
          ).length;

          return (
            <div key={category} className="metric-category">
              {/* Category header */}
              <button
                className="metric-category__header"
                onClick={() => toggleCategory(category)}
                aria-expanded={isExpanded}
              >
                <span className="metric-category__icon">
                  {CATEGORY_ICONS[category]}
                </span>
                <span className={`metric-category__label ${CATEGORY_COLORS[category]}`}>
                  {category}
                </span>
                <span className="metric-category__count">
                  {selectedInCat}/{metricsInCat.length}
                </span>
                <span className={`metric-category__chevron ${isExpanded ? "open" : ""}`}>
                  ›
                </span>
              </button>

              {/* Metric pills */}
              {isExpanded && (
                <div className="metric-category__pills">
                  {metricsInCat.map((metric) => {
                    const isSelected = selectedMetricIds.includes(metric.id);
                    const isHovered = hoveredMetric === metric.id;
                    const isOnlySelected =
                      isSelected && selectedMetricIds.length === 1;

                    return (
                      <button
                        key={metric.id}
                        className={`metric-pill ${isSelected ? "metric-pill--selected" : ""} ${CATEGORY_COLORS[category]}`}
                        onClick={() => onToggle(metric.id)}
                        onMouseEnter={() => setHoveredMetric(metric.id)}
                        onMouseLeave={() => setHoveredMetric(null)}
                        disabled={isOnlySelected}
                        title={
                          isOnlySelected
                            ? "At least one metric must be selected"
                            : metric.description
                        }
                        aria-pressed={isSelected}
                      >
                        <span className="metric-pill__label">{metric.shortLabel}</span>
                        <span className="metric-pill__unit">{metric.unit}</span>
                        {isSelected && (
                          <span className="metric-pill__check" aria-hidden="true">
                            ✓
                          </span>
                        )}

                        {/* Tooltip */}
                        {isHovered && (
                          <div className="metric-tooltip" role="tooltip">
                            <div className="metric-tooltip__label">{metric.label}</div>
                            <div className="metric-tooltip__desc">{metric.description}</div>
                            <div className="metric-tooltip__meta">
                              <span className="metric-tooltip__direction">
                                {metric.direction === "higher_is_better"
                                  ? "↑ Higher is better"
                                  : "↓ Lower is better"}
                              </span>
                              <span>Unit: {metric.unit}</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="metric-selector__legend">
        <div className="metric-legend-item">
          <span className="metric-legend-dot metric-legend-dot--selected" />
          <span>Selected</span>
        </div>
        <div className="metric-legend-item">
          <span className="metric-legend-dot" />
          <span>Not selected</span>
        </div>
      </div>
    </div>
  );
};
