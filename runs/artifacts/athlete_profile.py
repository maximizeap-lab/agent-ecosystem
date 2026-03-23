"""
Athlete Profile Management Module
==================================
Provides full CRUD operations for managing athlete profiles including
name, sport, age, position, and extended metadata.
"""

import uuid
import json
import re
from datetime import datetime, date
from typing import Optional
from dataclasses import dataclass, field, asdict


# ---------------------------------------------------------------------------
# Constants & Supported Options
# ---------------------------------------------------------------------------

SUPPORTED_SPORTS = [
    "Basketball", "Football", "Soccer", "Baseball", "Tennis",
    "Swimming", "Athletics", "Cycling", "Rugby", "Volleyball",
    "Hockey", "Golf", "Boxing", "Wrestling", "Gymnastics",
    "Rowing", "Skiing", "Snowboarding", "Surfing", "Other",
]

POSITIONS_BY_SPORT: dict[str, list[str]] = {
    "Basketball":   ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"],
    "Football":     ["Quarterback", "Running Back", "Wide Receiver", "Tight End", "Offensive Lineman",
                     "Defensive Lineman", "Linebacker", "Cornerback", "Safety", "Kicker", "Punter"],
    "Soccer":       ["Goalkeeper", "Centre-Back", "Full-Back", "Wing-Back", "Defensive Midfielder",
                     "Central Midfielder", "Attacking Midfielder", "Winger", "Striker"],
    "Baseball":     ["Pitcher", "Catcher", "First Baseman", "Second Baseman", "Third Baseman",
                     "Shortstop", "Left Fielder", "Center Fielder", "Right Fielder", "Designated Hitter"],
    "Rugby":        ["Prop", "Hooker", "Lock", "Flanker", "Number 8", "Scrum-Half",
                     "Fly-Half", "Centre", "Wing", "Fullback"],
    "Hockey":       ["Goaltender", "Defenseman", "Left Wing", "Center", "Right Wing"],
    "Volleyball":   ["Setter", "Outside Hitter", "Opposite Hitter", "Middle Blocker", "Libero", "Defensive Specialist"],
}


# ---------------------------------------------------------------------------
# Data Model
# ---------------------------------------------------------------------------

@dataclass
class AthleteProfile:
    """Represents a single athlete's complete profile."""

    # Core identity
    athlete_id:   str  = field(default_factory=lambda: str(uuid.uuid4()))
    first_name:   str  = ""
    last_name:    str  = ""
    sport:        str  = ""
    age:          int  = 0
    position:     str  = ""

    # Extended details
    nationality:  str  = ""
    height_cm:    Optional[float] = None   # centimetres
    weight_kg:    Optional[float] = None   # kilograms
    dominant_hand: Optional[str] = None   # "Left" | "Right" | "Ambidextrous"
    email:        str  = ""
    phone:        str  = ""
    bio:          str  = ""

    # Timestamps (ISO-8601 strings for easy serialisation)
    created_at:   str  = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at:   str  = field(default_factory=lambda: datetime.utcnow().isoformat())

    # ------------------------------------------------------------------ #
    # Computed helpers                                                      #
    # ------------------------------------------------------------------ #

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def to_dict(self) -> dict:
        """Serialise the profile to a plain dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "AthleteProfile":
        """Deserialise a profile from a plain dictionary."""
        allowed = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        filtered = {k: v for k, v in data.items() if k in allowed}
        return cls(**filtered)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ValidationError(Exception):
    """Raised when profile data fails validation."""
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_profile_data(data: dict, *, require_all_core: bool = True) -> list[str]:
    """
    Validate profile field values.

    Parameters
    ----------
    data              : dict of field values to validate.
    require_all_core  : when True, missing core fields are reported as errors.

    Returns a list of human-readable error strings (empty = valid).
    """
    errors: list[str] = []

    # --- first_name / last_name ---
    for key in ("first_name", "last_name"):
        value = data.get(key, "")
        if require_all_core and not value:
            errors.append(f"'{key}' is required.")
        elif value and not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ' \-]{1,60}$", str(value)):
            errors.append(f"'{key}' contains invalid characters or exceeds 60 chars.")

    # --- age ---
    age = data.get("age")
    if require_all_core and age is None:
        errors.append("'age' is required.")
    elif age is not None:
        try:
            age_int = int(age)
            if not (10 <= age_int <= 100):
                errors.append("'age' must be between 10 and 100.")
        except (TypeError, ValueError):
            errors.append("'age' must be a valid integer.")

    # --- sport ---
    sport = data.get("sport", "")
    if require_all_core and not sport:
        errors.append("'sport' is required.")
    elif sport and sport not in SUPPORTED_SPORTS:
        errors.append(f"'sport' must be one of: {', '.join(SUPPORTED_SPORTS)}.")

    # --- position ---
    position = data.get("position", "")
    if require_all_core and not position:
        errors.append("'position' is required.")
    elif position and sport in POSITIONS_BY_SPORT:
        if position not in POSITIONS_BY_SPORT[sport]:
            errors.append(
                f"'position' '{position}' is not valid for {sport}. "
                f"Valid positions: {', '.join(POSITIONS_BY_SPORT[sport])}."
            )

    # --- email (optional but validated when present) ---
    email = data.get("email", "")
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors.append("'email' is not a valid email address.")

    # --- phone (optional but validated when present) ---
    phone = data.get("phone", "")
    if phone and not re.match(r"^\+?[\d\s\-().]{7,20}$", phone):
        errors.append("'phone' is not a valid phone number.")

    # --- height_cm / weight_kg ---
    for metric, lo, hi in [("height_cm", 100, 250), ("weight_kg", 30, 300)]:
        val = data.get(metric)
        if val is not None:
            try:
                fval = float(val)
                if not (lo <= fval <= hi):
                    errors.append(f"'{metric}' must be between {lo} and {hi}.")
            except (TypeError, ValueError):
                errors.append(f"'{metric}' must be a valid number.")

    # --- dominant_hand ---
    hand = data.get("dominant_hand")
    if hand is not None and hand not in ("Left", "Right", "Ambidextrous"):
        errors.append("'dominant_hand' must be 'Left', 'Right', or 'Ambidextrous'.")

    return errors


# ---------------------------------------------------------------------------
# In-Memory Store (can be swapped for a DB adapter)
# ---------------------------------------------------------------------------

class AthleteStore:
    """
    Thread-unsafe in-memory store for athlete profiles.
    Replace the _db dict with a real database adapter in production.
    """

    def __init__(self):
        self._db: dict[str, AthleteProfile] = {}

    # ------------------------------------------------------------------ #
    # Internal helpers                                                      #
    # ------------------------------------------------------------------ #

    def _touch(self, profile: AthleteProfile) -> None:
        profile.updated_at = datetime.utcnow().isoformat()

    # ------------------------------------------------------------------ #
    # Public API                                                            #
    # ------------------------------------------------------------------ #

    def create(self, data: dict) -> AthleteProfile:
        """
        Create and store a new athlete profile.

        Parameters
        ----------
        data : dict containing profile fields.

        Returns the newly created AthleteProfile.
        Raises ValidationError on invalid data.
        """
        errors = validate_profile_data(data, require_all_core=True)
        if errors:
            raise ValidationError(errors)

        profile = AthleteProfile(
            first_name    = data["first_name"].strip(),
            last_name     = data["last_name"].strip(),
            sport         = data["sport"],
            age           = int(data["age"]),
            position      = data["position"],
            nationality   = data.get("nationality", ""),
            height_cm     = float(data["height_cm"]) if data.get("height_cm") is not None else None,
            weight_kg     = float(data["weight_kg"]) if data.get("weight_kg") is not None else None,
            dominant_hand = data.get("dominant_hand"),
            email         = data.get("email", ""),
            phone         = data.get("phone", ""),
            bio           = data.get("bio", ""),
        )
        self._db[profile.athlete_id] = profile
        return profile

    def get(self, athlete_id: str) -> AthleteProfile:
        """
        Retrieve a profile by ID.

        Raises KeyError if not found.
        """
        if athlete_id not in self._db:
            raise KeyError(f"Athlete '{athlete_id}' not found.")
        return self._db[athlete_id]

    def list_all(
        self,
        *,
        sport: Optional[str] = None,
        position: Optional[str] = None,
        min_age: Optional[int] = None,
        max_age: Optional[int] = None,
        name_query: Optional[str] = None,
    ) -> list[AthleteProfile]:
        """
        Return all profiles with optional filtering.

        Parameters
        ----------
        sport       : filter by sport name (case-insensitive).
        position    : filter by position (case-insensitive).
        min_age     : minimum age (inclusive).
        max_age     : maximum age (inclusive).
        name_query  : substring match against full name (case-insensitive).
        """
        results = list(self._db.values())

        if sport:
            results = [p for p in results if p.sport.lower() == sport.lower()]
        if position:
            results = [p for p in results if p.position.lower() == position.lower()]
        if min_age is not None:
            results = [p for p in results if p.age >= min_age]
        if max_age is not None:
            results = [p for p in results if p.age <= max_age]
        if name_query:
            q = name_query.lower()
            results = [p for p in results if q in p.full_name.lower()]

        return sorted(results, key=lambda p: (p.last_name.lower(), p.first_name.lower()))

    def update(self, athlete_id: str, updates: dict) -> AthleteProfile:
        """
        Partially update an existing athlete profile.

        Only the fields present in `updates` are changed.
        Core required fields must still be valid if they appear in `updates`.

        Raises KeyError if not found, ValidationError on bad data.
        """
        profile = self.get(athlete_id)   # raises KeyError if missing

        # Merge current + incoming so cross-field validation still works
        current = profile.to_dict()
        merged  = {**current, **updates}

        errors = validate_profile_data(merged, require_all_core=True)
        if errors:
            raise ValidationError(errors)

        # Apply only the supplied fields
        str_fields   = ("first_name", "last_name", "sport", "position",
                        "nationality", "email", "phone", "bio", "dominant_hand")
        int_fields   = ("age",)
        float_fields = ("height_cm", "weight_kg")

        for key in str_fields:
            if key in updates:
                value = updates[key]
                setattr(profile, key, value.strip() if isinstance(value, str) else value)

        for key in int_fields:
            if key in updates:
                setattr(profile, key, int(updates[key]))

        for key in float_fields:
            if key in updates:
                val = updates[key]
                setattr(profile, key, float(val) if val is not None else None)

        self._touch(profile)
        return profile

    def delete(self, athlete_id: str) -> AthleteProfile:
        """
        Remove an athlete profile by ID.

        Returns the deleted profile.
        Raises KeyError if not found.
        """
        profile = self.get(athlete_id)   # raises KeyError if missing
        del self._db[athlete_id]
        return profile

    def count(self) -> int:
        """Return total number of stored profiles."""
        return len(self._db)

    def export_json(self) -> str:
        """Serialise all profiles to a JSON string."""
        return json.dumps(
            [p.to_dict() for p in self.list_all()],
            indent=2
        )

    def import_json(self, json_str: str, *, overwrite: bool = False) -> int:
        """
        Load profiles from a JSON string (list of profile dicts).

        Parameters
        ----------
        json_str  : JSON array of profile dicts.
        overwrite : if True, existing profiles with the same ID are replaced.

        Returns the number of profiles imported.
        """
        records = json.loads(json_str)
        if not isinstance(records, list):
            raise ValueError("JSON must be a list of profile objects.")

        imported = 0
        for record in records:
            errors = validate_profile_data(record, require_all_core=True)
            if errors:
                raise ValidationError(errors)
            profile = AthleteProfile.from_dict(record)
            if profile.athlete_id in self._db and not overwrite:
                continue
            self._db[profile.athlete_id] = profile
            imported += 1

        return imported
