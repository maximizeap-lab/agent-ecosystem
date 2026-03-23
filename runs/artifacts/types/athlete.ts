// ─────────────────────────────────────────────
//  Athlete Profile – Type Definitions
// ─────────────────────────────────────────────

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";
export type DominantHand = "left" | "right" | "ambidextrous";
export type DominantFoot = "left" | "right" | "both";
export type ProfileStatus = "active" | "inactive" | "injured" | "retired" | "suspended";
export type MeasurementUnit = "metric" | "imperial";

// ── Sport ────────────────────────────────────
export interface Sport {
  id: string;
  name: string;
  category: string; // e.g. "team", "individual", "combat"
  positions?: Position[];
}

export interface Position {
  id: string;
  name: string;
  abbreviation: string;
  sportId: string;
}

// ── Team ─────────────────────────────────────
export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  city: string;
  country: string;
  sportId: string;
  division?: string;
  league?: string;
  foundedYear?: number;
}

// ── Emergency Contact ─────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// ── Medical Info ──────────────────────────────
export interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  existingConditions: string[];
  medications: string[];
  notes?: string;
}

// ── Social Links ──────────────────────────────
export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
}

// ── Career History ────────────────────────────
export interface CareerEntry {
  id: string;
  teamId?: string;
  teamName: string;             // stored for historical records
  sportId?: string;
  sportName: string;
  position?: string;
  startDate: string;            // ISO date string
  endDate?: string;             // undefined = current
  jerseyNumber?: number;
  notes?: string;
}

// ── Physical Stats ────────────────────────────
export interface PhysicalStats {
  heightCm?: number;
  weightKg?: number;
  unit: MeasurementUnit;
  dominantHand?: DominantHand;
  dominantFoot?: DominantFoot;
  wingspan?: number;            // cm
  verticalJump?: number;        // cm
  fortyYardDash?: number;       // seconds
}

// ── Core Athlete Profile ──────────────────────
export interface AthleteProfile {
  id: string;

  // Personal
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;          // ISO date
  gender: Gender;
  nationality: string;
  secondaryNationality?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;

  // Contact
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };

  // Sport & Team
  primarySportId: string;
  primarySport?: Sport;
  primaryTeamId?: string;
  primaryTeam?: Team;
  jerseyNumber?: number;
  primaryPositionId?: string;
  primaryPosition?: Position;
  secondaryPositionId?: string;
  secondaryPosition?: Position;
  careerHistory: CareerEntry[];

  // Physical
  physicalStats: PhysicalStats;

  // Meta
  status: ProfileStatus;
  joinedDate: string;           // ISO date
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  socialLinks: SocialLinks;
  emergencyContacts: EmergencyContact[];
  medicalInfo: MedicalInfo;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── Form Values (omit computed / server fields) ─
export type AthleteFormValues = Omit<
  AthleteProfile,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "primarySport" | "primaryTeam" | "primaryPosition" | "secondaryPosition"
>;

// ── Validation Errors ─────────────────────────
export type FormErrors = Partial<Record<keyof AthleteFormValues | string, string>>;

// ── List / Search ─────────────────────────────
export interface AthleteListItem {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  avatarUrl?: string;
  primarySport?: string;
  primaryTeam?: string;
  jerseyNumber?: number;
  status: ProfileStatus;
  nationality: string;
  dateOfBirth: string;
  updatedAt: string;
}

export interface AthleteFilters {
  search: string;
  sportId: string;
  teamId: string;
  status: ProfileStatus | "";
  nationality: string;
  page: number;
  perPage: number;
  sortBy: keyof AthleteListItem;
  sortDir: "asc" | "desc";
}
