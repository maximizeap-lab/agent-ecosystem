// ─────────────────────────────────────────────────────────────────────────────
// AthleteComparison.tsx – Root orchestrator component
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useLeaderboard } from "./useLeaderboard";
import { MetricSelector } from "./MetricSelector";
import { LeaderboardTable } from "./LeaderboardTable";
import { ComparisonTable } from "./ComparisonTable";
import { RadarChart } from "./RadarChart";
import { AthleteCard } from "./AthleteCard";
import { getMedalTier, Sport } from "./types";

const SPORTS: (Sport | "All")[] = [
  "All",
  "Athletics",
  "Swimming",
  "Cycling",
  "Triathlon",
  "Weightlifting",
];

const SPORT_ICONS: Record<string, string> = {
  All: "🏅",
  Athletics: "🏃",
  Swimming: "🏊",
  Cycling: "🚴",
  Triathlon: "🔱",
  Weightlifting: "🏋️",
};

export const AthleteComparison: React.FC = () => {
  const lb = useLeaderboard();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    leaderboardRows,
    selectedMetricIds,
    selectedAthleteIds,
    sortMetricId,
    sortDirection,
    activeView,
    searchQuery,
    sportFilter,
    radarData,
    allMetrics,
    allAthletes,
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
  } = lb;

  // Build rank map for AthleteCard badges
  const rankMap: Record<string, number> = {};
  const scoreMap: Record<string, number> = {};
  leaderboardRows.forEach((row) => {
    rankMap[row.athlete.id] = row.rank;
    scoreMap[row.athlete.id] = row.compositeScore;
  });

  // Stats for summary bar
  const totalAthletes = leaderboardRows.length;
  const topScore = leaderboardRows[0]?.compositeScore ?? 0;
  const topAthlete = leaderboardRows[0]?.athlete.name ?? "—";

  return (
    <div className="app">
      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <div className="app-brand">
            <span className="app-brand__icon">🏆</span>
            <div className="app-brand__text">
              <span className="app-brand__title">AthletiQ</span>
              <span className="app-brand__sub">Performance Analytics</span>
            </div>
          </div>
        </div>

        {/* View switcher */}
        <nav className="view-switcher" aria-label="View selector">
          {(
            [
              { id: "leaderboard", label: "Leaderboard", icon: "📋" },
              { id: "comparison", label: "Compare", icon: "⚖️" },
              { id: "radar", label: "Radar", icon: "🕸️" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              className={`view-btn ${activeView === v.id ? "view-btn--active" : ""}`}
              onClick={() => setActiveView(v.id)}
              aria-current={activeView === v.id ? "page" : undefined}
            >
              <span className="view-btn__icon">{v.icon}</span>
              <span className="view-btn__label">{v.label}</span>
            </button>
          ))}
        </nav>

        <div className="app-header__right">
          <button className="reset-btn" onClick={resetFilters} title="Reset all filters">
            ↺ Reset
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="app-body">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className={`app-sidebar ${sidebarOpen ? "" : "app-sidebar--collapsed"}`}>
          {sidebarOpen && (
            <>
              {/* Metric selector */}
              <MetricSelector
                allMetrics={allMetrics}
                selectedMetricIds={selectedMetricIds}
                onToggle={toggleMetric}
              />

              {/* Athlete selector */}
              <section className="athlete-selector">
                <div className="athlete-selector__header">
                  <span className="athlete-selector__icon">👤</span>
                  <h3 className="athlete-selector__title">Athletes</h3>
                  <span className="athlete-selector__badge">
                    {selectedAthleteIds.length}/{allAthletes.length}
                  </span>
                </div>

                {/* Search */}
                <div className="athlete-search">
                  <span className="athlete-search__icon">🔍</span>
                  <input
                    className="athlete-search__input"
                    type="search"
                    placeholder="Search name, club…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search athletes"
                  />
                  {searchQuery && (
                    <button
                      className="athlete-search__clear"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Sport filters */}
                <div className="sport-filter" role="group" aria-label="Filter by sport">
                  {SPORTS.map((sport) => (
                    <button
                      key={sport}
                      className={`sport-pill ${sportFilter === sport ? "sport-pill--active" : ""}`}
                      onClick={() => setSportFilter(sport)}
                      title={sport}
                      aria-pressed={sportFilter === sport}
                    >
                      <span className="sport-pill__icon">{SPORT_ICONS[sport]}</span>
                      <span className="sport-pill__label">{sport}</span>
                    </button>
                  ))}
                </div>

                {/* Bulk actions */}
                <div className="athlete-bulk">
                  <button className="bulk-btn" onClick={selectAllAthletes}>
                    Select All
                  </button>
                  <button className="bulk-btn" onClick={clearAthletes}>
                    Clear
                  </button>
                </div>

                {/* Athlete cards */}
                <div className="athlete-card-list">
                  {allAthletes
                    .filter(
                      (a) =>
                        (sportFilter === "All" || a.sport === sportFilter) &&
                        (searchQuery === "" ||
                          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.club.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((athlete) => {
                      const rank = rankMap[athlete.id];
                      const score = scoreMap[athlete.id];
                      const isSelected = selectedAthleteIds.includes(athlete.id);
                      const isDisabled =
                        isSelected && selectedAthleteIds.length === 2;

                      return (
                        <AthleteCard
                          key={athlete.id}
                          athlete={athlete}
                          isSelected={isSelected}
                          rank={rank}
                          compositeScore={score}
                          medalTier={rank ? getMedalTier(rank) : "none"}
                          onToggle={toggleAthlete}
                          disabled={isDisabled}
                        />
                      );
                    })}
                </div>
              </section>
            </>
          )}

          {/* Collapsed state icon strip */}
          {!sidebarOpen && (
            <div className="sidebar-collapsed-icons">
              <span title="Metrics">📊</span>
              <span title="Athletes">👥</span>
            </div>
          )}
        </aside>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <main className="app-main">
          {/* Summary bar */}
          <div className="summary-bar">
            <div className="summary-stat">
              <span className="summary-stat__value">{totalAthletes}</span>
              <span className="summary-stat__label">Athletes</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-stat__value">{selectedMetricIds.length}</span>
              <span className="summary-stat__label">Metrics</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-stat__value summary-stat__value--highlight">
                {topAthlete}
              </span>
              <span className="summary-stat__label">🏆 Leader</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-stat__value">{topScore}</span>
              <span className="summary-stat__label">Top Score</span>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <span className="summary-stat__value">
                {activeView === "leaderboard"
                  ? "Ranked"
                  : activeView === "comparison"
                  ? "Side-by-Side"
                  : "Radar"}
              </span>
              <span className="summary-stat__label">View Mode</span>
            </div>
          </div>

          {/* Content views */}
          <div className="app-content">
            {activeView === "leaderboard" && (
              <section aria-label="Leaderboard view">
                <div className="content-header">
                  <h2 className="content-header__title">
                    <span>📋</span> Athlete Leaderboard
                  </h2>
                  <p className="content-header__desc">
                    Ranked by composite score across{" "}
                    <strong>{selectedMetricIds.length}</strong> selected metric
                    {selectedMetricIds.length !== 1 ? "s" : ""}. Click any
                    column header to sort. Click a row to expand details.
                  </p>
                </div>
                <LeaderboardTable
                  rows={leaderboardRows}
                  selectedMetricIds={selectedMetricIds}
                  sortMetricId={sortMetricId}
                  sortDirection={sortDirection}
                  onSortChange={setSortMetric}
                  onToggleSortDirection={toggleSortDirection}
                />
              </section>
            )}

            {activeView === "comparison" && (
              <section aria-label="Comparison view">
                <div className="content-header">
                  <h2 className="content-header__title">
                    <span>⚖️</span> Head-to-Head Comparison
                  </h2>
                  <p className="content-header__desc">
                    Side-by-side breakdown for{" "}
                    <strong>{leaderboardRows.length}</strong> athlete
                    {leaderboardRows.length !== 1 ? "s" : ""} across selected
                    metrics. ★ highlights the best value per metric.
                  </p>
                </div>
                <ComparisonTable
                  rows={leaderboardRows}
                  selectedMetricIds={selectedMetricIds}
                />
              </section>
            )}

            {activeView === "radar" && (
              <section aria-label="Radar view">
                <div className="content-header">
                  <h2 className="content-header__title">
                    <span>🕸️</span> Multi-Metric Radar
                  </h2>
                  <p className="content-header__desc">
                    Normalised spider chart (0–100 per axis). Hover athlete
                    polygons or legend items to isolate. All values scaled so
                    100 = peak performance.
                  </p>
                </div>
                <div className="radar-container">
                  <RadarChart
                    data={radarData}
                    rows={leaderboardRows}
                    width={500}
                    height={500}
                  />
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AthleteComparison;
