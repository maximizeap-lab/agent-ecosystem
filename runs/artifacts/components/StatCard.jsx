import React from "react";

/**
 * StatCard — A reusable KPI / statistics card.
 *
 * Props:
 *  title       : string
 *  value       : string | number
 *  subtitle    : string            — secondary description
 *  icon        : ReactNode         — icon element
 *  trend       : number            — percentage change (+/-)
 *  trendLabel  : string            — e.g. "vs last month"
 *  variant     : "default" | "primary" | "success" | "warning" | "danger" | "info"
 *  loading     : boolean
 *  onClick     : () => void
 *  footer      : ReactNode         — optional slot at the bottom
 *  sparkline   : Array<number>     — mini sparkline data
 */
export default function StatCard({
  title = "Metric",
  value = "—",
  subtitle,
  icon,
  trend,
  trendLabel = "vs last period",
  variant = "default",
  loading = false,
  onClick,
  footer,
  sparkline,
}) {
  const isPositive = trend > 0;
  const isNeutral  = trend === 0 || trend == null;

  const trendClass = isNeutral
    ? "sc-trend-neutral"
    : isPositive
    ? "sc-trend-up"
    : "sc-trend-down";

  const TrendIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      {isNeutral ? (
        <path d="M4 12h16" stroke="currentColor" strokeWidth="2" fill="none" />
      ) : isPositive ? (
        <path d="M12 4l8 8-8 8" />
      ) : (
        <path d="M12 20l8-8-8-8" />
      )}
    </svg>
  );

  /* ── Mini sparkline (SVG path) ── */
  const SparkLine = ({ data }) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80, h = 28;
    const step = w / (data.length - 1);
    const points = data
      .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
      .join(" ");
    return (
      <svg className="sc-sparkline" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div
      className={`sc-card sc-variant-${variant} ${onClick ? "sc-clickable" : ""} ${loading ? "sc-loading" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* ── Top row ── */}
      <div className="sc-header">
        <span className="sc-title">{loading ? <span className="sc-skeleton sc-skeleton-title" /> : title}</span>
        {icon && <span className={`sc-icon-wrap sc-icon-${variant}`}>{icon}</span>}
      </div>

      {/* ── Value ── */}
      <div className="sc-value-row">
        {loading ? (
          <span className="sc-skeleton sc-skeleton-value" />
        ) : (
          <span className="sc-value">{value}</span>
        )}
        {sparkline && !loading && <SparkLine data={sparkline} />}
      </div>

      {/* ── Subtitle ── */}
      {subtitle && !loading && <p className="sc-subtitle">{subtitle}</p>}

      {/* ── Trend ── */}
      {trend != null && !loading && (
        <div className={`sc-trend ${trendClass}`}>
          <TrendIcon />
          <span className="sc-trend-value">
            {isPositive ? "+" : ""}{trend}%
          </span>
          <span className="sc-trend-label">{trendLabel}</span>
        </div>
      )}

      {/* ── Footer slot ── */}
      {footer && <div className="sc-footer">{footer}</div>}
    </div>
  );
}

/* ── StatCardGrid helper ── */
export function StatCardGrid({ children }) {
  return <div className="sc-grid">{children}</div>;
}
