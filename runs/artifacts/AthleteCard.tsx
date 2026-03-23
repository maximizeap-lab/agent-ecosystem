// ─────────────────────────────────────────────────────────────────────────────
// AthleteCard.tsx – Compact athlete selection card with toggle
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { Athlete, MedalTier } from "./types";

interface AthleteCardProps {
  athlete: Athlete;
  isSelected: boolean;
  rank?: number;
  compositeScore?: number;
  medalTier?: MedalTier;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

const MEDAL_LABELS: Record<MedalTier, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  none: "",
};

export const AthleteCard: React.FC<AthleteCardProps> = ({
  athlete,
  isSelected,
  rank,
  compositeScore,
  medalTier = "none",
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      className={`athlete-card ${isSelected ? "athlete-card--selected" : ""} ${disabled ? "athlete-card--disabled" : ""}`}
      style={
        isSelected
          ? ({
              "--athlete-accent": athlete.accentColor,
              borderColor: athlete.accentColor,
            } as React.CSSProperties)
          : undefined
      }
      onClick={() => onToggle(athlete.id)}
      disabled={disabled}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? "Deselect" : "Select"} ${athlete.name}`}
    >
      {/* Selection indicator */}
      <div
        className="athlete-card__selector"
        style={isSelected ? { backgroundColor: athlete.accentColor } : undefined}
      >
        {isSelected && <span className="athlete-card__check">✓</span>}
      </div>

      {/* Avatar */}
      <div
        className="athlete-card__avatar"
        style={{ backgroundColor: athlete.accentColor + "22", color: athlete.accentColor }}
      >
        <span className="athlete-card__initials">{athlete.avatarInitials}</span>
        {rank && rank <= 3 && (
          <span className="athlete-card__medal" aria-label={`Rank ${rank}`}>
            {MEDAL_LABELS[medalTier]}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="athlete-card__info">
        <div className="athlete-card__name-row">
          <span className="athlete-card__flag" aria-hidden="true">
            {athlete.flagEmoji}
          </span>
          <span className="athlete-card__name">{athlete.name}</span>
        </div>
        <div className="athlete-card__meta">
          <span className="athlete-card__sport">{athlete.sport}</span>
          <span className="athlete-card__dot">·</span>
          <span className="athlete-card__age">Age {athlete.age}</span>
        </div>
        {compositeScore !== undefined && (
          <div className="athlete-card__score">
            <div
              className="athlete-card__score-bar"
              style={{ width: `${compositeScore}%`, backgroundColor: athlete.accentColor }}
            />
            <span className="athlete-card__score-value">{compositeScore}</span>
          </div>
        )}
      </div>

      {/* Rank badge */}
      {rank && (
        <div
          className={`athlete-card__rank athlete-card__rank--${medalTier}`}
          aria-label={`Rank ${rank}`}
        >
          #{rank}
        </div>
      )}
    </button>
  );
};
