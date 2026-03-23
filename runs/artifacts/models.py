"""
Data models for training load and recovery monitoring.

Covers workouts, rest days, fatigue snapshots, and athlete profiles
using dataclasses for clean, typed, serialisable structures.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class Sport(str, Enum):
    RUNNING   = "running"
    CYCLING   = "cycling"
    SWIMMING  = "swimming"
    STRENGTH  = "strength"
    ROWING    = "rowing"
    YOGA      = "yoga"
    HIIT      = "hiit"
    WALKING   = "walking"
    OTHER     = "other"


class IntensityZone(str, Enum):
    """Five-zone intensity model (Seiler zones)."""
    Z1_RECOVERY    = "Z1"   # < 68 % HRmax
    Z2_AEROBIC     = "Z2"   # 68-83 % HRmax
    Z3_TEMPO       = "Z3"   # 83-88 % HRmax
    Z4_THRESHOLD   = "Z4"   # 88-95 % HRmax
    Z5_ANAEROBIC   = "Z5"   # > 95 % HRmax


class FatigueLevel(str, Enum):
    FRESH        = "fresh"
    OPTIMAL      = "optimal"
    MODERATE     = "moderate"
    HIGH         = "high"
    OVERREACHING = "overreaching"
    OVERTRAINING = "overtraining"


class RecoveryQuality(str, Enum):
    POOR      = "poor"       # 1-3
    FAIR      = "fair"       # 4-5
    GOOD      = "good"       # 6-7
    EXCELLENT = "excellent"  # 8-10


# ---------------------------------------------------------------------------
# Core workout model
# ---------------------------------------------------------------------------

@dataclass
class HeartRateData:
    """Optional HR metrics captured during a session."""
    avg_hr:      int             # bpm
    max_hr:      int             # bpm
    hr_reserve:  float           # fraction 0-1 (HRR method)
    zone_times:  Dict[str, int]  # IntensityZone → minutes


@dataclass
class Workout:
    """
    A single training session.

    TSS (Training Stress Score) is computed externally by the calculators
    module and stored here for fast retrieval.
    """
    sport:           Sport
    duration_min:    float                     # total duration in minutes
    date:            date
    perceived_effort: float                    # RPE 1-10 scale
    tss:             float  = 0.0             # computed training stress score
    distance_km:     Optional[float] = None
    elevation_m:     Optional[float] = None
    avg_power_w:     Optional[float] = None    # for cycling/rowing
    avg_pace_min_km: Optional[float] = None    # for running/walking
    hr_data:         Optional[HeartRateData] = None
    notes:           str   = ""
    tags:            List[str] = field(default_factory=list)
    workout_id:      str   = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at:      datetime = field(default_factory=datetime.utcnow)

    # ------------------------------------------------------------------ #
    # Convenience helpers
    # ------------------------------------------------------------------ #

    @property
    def intensity_factor(self) -> float:
        """RPE-based rough intensity factor (0-1 scale)."""
        return self.perceived_effort / 10.0

    @property
    def is_high_intensity(self) -> bool:
        return self.perceived_effort >= 7.0

    def to_dict(self) -> dict:
        return {
            "workout_id":       self.workout_id,
            "sport":            self.sport.value,
            "date":             self.date.isoformat(),
            "duration_min":     self.duration_min,
            "perceived_effort": self.perceived_effort,
            "tss":              self.tss,
            "distance_km":      self.distance_km,
            "elevation_m":      self.elevation_m,
            "avg_power_w":      self.avg_power_w,
            "avg_pace_min_km":  self.avg_pace_min_km,
            "notes":            self.notes,
            "tags":             self.tags,
            "created_at":       self.created_at.isoformat(),
            "hr_data": {
                "avg_hr":     self.hr_data.avg_hr,
                "max_hr":     self.hr_data.max_hr,
                "hr_reserve": self.hr_data.hr_reserve,
                "zone_times": self.hr_data.zone_times,
            } if self.hr_data else None,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Workout":
        hr_raw = data.get("hr_data")
        hr = HeartRateData(**hr_raw) if hr_raw else None
        return cls(
            workout_id       = data["workout_id"],
            sport            = Sport(data["sport"]),
            date             = date.fromisoformat(data["date"]),
            duration_min     = data["duration_min"],
            perceived_effort = data["perceived_effort"],
            tss              = data.get("tss", 0.0),
            distance_km      = data.get("distance_km"),
            elevation_m      = data.get("elevation_m"),
            avg_power_w      = data.get("avg_power_w"),
            avg_pace_min_km  = data.get("avg_pace_min_km"),
            notes            = data.get("notes", ""),
            tags             = data.get("tags", []),
            created_at       = datetime.fromisoformat(data["created_at"]),
            hr_data          = hr,
        )


# ---------------------------------------------------------------------------
# Rest day model
# ---------------------------------------------------------------------------

@dataclass
class RestDay:
    """
    A deliberate rest or active-recovery day.

    Active recovery (light walk, yoga, foam-rolling) is distinguished from
    complete rest so the model can give partial recovery credit.
    """
    date:            date
    is_active:       bool  = False   # True → active recovery; False → full rest
    sleep_hours:     float = 7.0
    sleep_quality:   int   = 7       # 1-10
    hrv_ms:          Optional[float] = None   # morning HRV in ms
    resting_hr_bpm:  Optional[int]   = None
    mood_score:      int   = 7       # 1-10 subjective well-being
    soreness_score:  int   = 3       # 1-10 (1 = none, 10 = severe)
    notes:           str   = ""
    rest_id:         str   = field(default_factory=lambda: str(uuid.uuid4())[:8])

    @property
    def recovery_quality(self) -> RecoveryQuality:
        composite = (self.sleep_quality + self.mood_score + (10 - self.soreness_score)) / 3
        if composite >= 8:
            return RecoveryQuality.EXCELLENT
        if composite >= 6:
            return RecoveryQuality.GOOD
        if composite >= 4:
            return RecoveryQuality.FAIR
        return RecoveryQuality.POOR

    @property
    def recovery_score(self) -> float:
        """
        0-100 composite recovery score.
        Components: sleep quality (40%), mood (30%), inverse soreness (30%).
        HRV bonus ±5 pts when available (above/below 50 ms threshold).
        """
        base = (
            (self.sleep_quality / 10) * 40
            + (self.mood_score  / 10) * 30
            + ((10 - self.soreness_score) / 10) * 30
        )
        if self.hrv_ms is not None:
            base += 5 if self.hrv_ms >= 50 else -5
        return max(0.0, min(100.0, base))

    def to_dict(self) -> dict:
        return {
            "rest_id":        self.rest_id,
            "date":           self.date.isoformat(),
            "is_active":      self.is_active,
            "sleep_hours":    self.sleep_hours,
            "sleep_quality":  self.sleep_quality,
            "hrv_ms":         self.hrv_ms,
            "resting_hr_bpm": self.resting_hr_bpm,
            "mood_score":     self.mood_score,
            "soreness_score": self.soreness_score,
            "notes":          self.notes,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "RestDay":
        return cls(
            rest_id        = data["rest_id"],
            date           = date.fromisoformat(data["date"]),
            is_active      = data.get("is_active", False),
            sleep_hours    = data.get("sleep_hours", 7.0),
            sleep_quality  = data.get("sleep_quality", 7),
            hrv_ms         = data.get("hrv_ms"),
            resting_hr_bpm = data.get("resting_hr_bpm"),
            mood_score     = data.get("mood_score", 7),
            soreness_score = data.get("soreness_score", 3),
            notes          = data.get("notes", ""),
        )


# ---------------------------------------------------------------------------
# Daily fatigue snapshot
# ---------------------------------------------------------------------------

@dataclass
class FatigueSnapshot:
    """
    Daily computed training-load metrics stored for historical analysis.

    ATL  – Acute Training Load   (7-day EMA  ≈ fatigue)
    CTL  – Chronic Training Load (42-day EMA ≈ fitness)
    TSB  – Training Stress Balance  = CTL – ATL  (form)
    ACWR – Acute:Chronic Workload Ratio
    """
    date:        date
    atl:         float   # Acute Training Load
    ctl:         float   # Chronic Training Load
    tsb:         float   # Training Stress Balance (form)
    acwr:        float   # Acute:Chronic Workload Ratio
    daily_tss:   float   # TSS for this specific day
    fatigue_level:      FatigueLevel
    readiness_score:    float  # 0-100
    recommended_action: str

    def to_dict(self) -> dict:
        return {
            "date":               self.date.isoformat(),
            "atl":                round(self.atl, 2),
            "ctl":                round(self.ctl, 2),
            "tsb":                round(self.tsb, 2),
            "acwr":               round(self.acwr, 3),
            "daily_tss":          round(self.daily_tss, 2),
            "fatigue_level":      self.fatigue_level.value,
            "readiness_score":    round(self.readiness_score, 1),
            "recommended_action": self.recommended_action,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "FatigueSnapshot":
        return cls(
            date               = date.fromisoformat(data["date"]),
            atl                = data["atl"],
            ctl                = data["ctl"],
            tsb                = data["tsb"],
            acwr               = data["acwr"],
            daily_tss          = data["daily_tss"],
            fatigue_level      = FatigueLevel(data["fatigue_level"]),
            readiness_score    = data["readiness_score"],
            recommended_action = data["recommended_action"],
        )


# ---------------------------------------------------------------------------
# Athlete profile
# ---------------------------------------------------------------------------

@dataclass
class Athlete:
    """
    Athlete profile containing physiological baselines used by calculators.
    """
    name:            str
    athlete_id:      str   = field(default_factory=lambda: str(uuid.uuid4())[:8])
    age:             int   = 30
    max_hr:          int   = 190       # bpm
    resting_hr:      int   = 55        # bpm
    ftp_watts:       Optional[float] = None  # Functional Threshold Power
    threshold_pace:  Optional[float] = None  # min/km at lactate threshold
    weight_kg:       float = 70.0
    primary_sport:   Sport = Sport.RUNNING

    @property
    def hr_reserve(self) -> int:
        return self.max_hr - self.resting_hr

    def to_dict(self) -> dict:
        return {
            "athlete_id":      self.athlete_id,
            "name":            self.name,
            "age":             self.age,
            "max_hr":          self.max_hr,
            "resting_hr":      self.resting_hr,
            "ftp_watts":       self.ftp_watts,
            "threshold_pace":  self.threshold_pace,
            "weight_kg":       self.weight_kg,
            "primary_sport":   self.primary_sport.value,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Athlete":
        return cls(
            athlete_id     = data["athlete_id"],
            name           = data["name"],
            age            = data.get("age", 30),
            max_hr         = data.get("max_hr", 190),
            resting_hr     = data.get("resting_hr", 55),
            ftp_watts      = data.get("ftp_watts"),
            threshold_pace = data.get("threshold_pace"),
            weight_kg      = data.get("weight_kg", 70.0),
            primary_sport  = Sport(data.get("primary_sport", "running")),
        )
