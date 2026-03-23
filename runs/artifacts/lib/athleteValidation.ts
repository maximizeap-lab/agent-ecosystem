// ─────────────────────────────────────────────
//  Athlete Profile – Validation Logic
// ─────────────────────────────────────────────
import type { AthleteFormValues, FormErrors, EmergencyContact, CareerEntry } from "../types/athlete";

const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE   = /^https?:\/\/.+/i;

// ── Helpers ──────────────────────────────────
function isBlank(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === "";
}

function validateEmail(email: string): string | undefined {
  if (isBlank(email)) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
}

function validatePhone(phone: string | undefined, required = false): string | undefined {
  if (isBlank(phone)) return required ? "Phone number is required." : undefined;
  if (!PHONE_RE.test(phone!)) return "Enter a valid phone number.";
}

function validateUrl(url: string | undefined, fieldName: string): string | undefined {
  if (isBlank(url)) return undefined;
  if (!URL_RE.test(url!)) return `${fieldName} must be a valid URL starting with http:// or https://.`;
}

function validateDate(
  dateStr: string,
  fieldName: string,
  opts: { minAge?: number; maxAge?: number; notFuture?: boolean } = {}
): string | undefined {
  if (isBlank(dateStr)) return `${fieldName} is required.`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return `${fieldName} must be a valid date.`;
  const now = new Date();
  if (opts.notFuture && d > now) return `${fieldName} cannot be in the future.`;
  if (opts.minAge !== undefined) {
    const ageYears = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears < opts.minAge) return `Athlete must be at least ${opts.minAge} years old.`;
  }
  if (opts.maxAge !== undefined) {
    const ageYears = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears > opts.maxAge) return `Age seems too high (max ${opts.maxAge} years).`;
  }
}

// ── Emergency Contacts ────────────────────────
function validateEmergencyContacts(contacts: EmergencyContact[]): Record<string, string> {
  const errors: Record<string, string> = {};
  contacts.forEach((c, i) => {
    if (isBlank(c.name))         errors[`emergencyContacts[${i}].name`]         = "Contact name is required.";
    if (isBlank(c.relationship)) errors[`emergencyContacts[${i}].relationship`] = "Relationship is required.";
    const phoneErr = validatePhone(c.phone, true);
    if (phoneErr)                errors[`emergencyContacts[${i}].phone`]        = phoneErr;
    if (!isBlank(c.email)) {
      const emailErr = validateEmail(c.email!);
      if (emailErr)              errors[`emergencyContacts[${i}].email`]        = emailErr;
    }
  });
  return errors;
}

// ── Career History ────────────────────────────
function validateCareerHistory(entries: CareerEntry[]): Record<string, string> {
  const errors: Record<string, string> = {};
  entries.forEach((e, i) => {
    if (isBlank(e.teamName))  errors[`careerHistory[${i}].teamName`]  = "Team name is required.";
    if (isBlank(e.sportName)) errors[`careerHistory[${i}].sportName`] = "Sport is required.";
    if (isBlank(e.startDate)) errors[`careerHistory[${i}].startDate`] = "Start date is required.";
    if (!isBlank(e.startDate) && !isBlank(e.endDate)) {
      if (new Date(e.endDate!) < new Date(e.startDate)) {
        errors[`careerHistory[${i}].endDate`] = "End date must be after start date.";
      }
    }
    if (e.jerseyNumber !== undefined) {
      if (!Number.isInteger(e.jerseyNumber) || e.jerseyNumber < 0 || e.jerseyNumber > 999) {
        errors[`careerHistory[${i}].jerseyNumber`] = "Jersey number must be between 0 and 999.";
      }
    }
  });
  return errors;
}

// ── Physical Stats ────────────────────────────
function validatePhysicalStats(stats: AthleteFormValues["physicalStats"]): Record<string, string> {
  const errors: Record<string, string> = {};
  if (stats.heightCm !== undefined) {
    if (stats.heightCm < 50 || stats.heightCm > 280)
      errors["physicalStats.heightCm"] = "Height must be between 50 cm and 280 cm.";
  }
  if (stats.weightKg !== undefined) {
    if (stats.weightKg < 20 || stats.weightKg > 400)
      errors["physicalStats.weightKg"] = "Weight must be between 20 kg and 400 kg.";
  }
  if (stats.wingspan !== undefined && (stats.wingspan < 50 || stats.wingspan > 300))
    errors["physicalStats.wingspan"] = "Wingspan must be between 50 cm and 300 cm.";
  if (stats.verticalJump !== undefined && (stats.verticalJump < 0 || stats.verticalJump > 200))
    errors["physicalStats.verticalJump"] = "Vertical jump must be between 0 and 200 cm.";
  if (stats.fortyYardDash !== undefined && (stats.fortyYardDash < 2 || stats.fortyYardDash > 20))
    errors["physicalStats.fortyYardDash"] = "40-yard dash must be between 2 and 20 seconds.";
  return errors;
}

// ── Social Links ──────────────────────────────
function validateSocialLinks(links: AthleteFormValues["socialLinks"]): Record<string, string> {
  const errors: Record<string, string> = {};
  const fields: Array<keyof typeof links> = ["instagram", "twitter", "facebook", "tiktok", "youtube", "website"];
  fields.forEach((f) => {
    const err = validateUrl(links[f], f.charAt(0).toUpperCase() + f.slice(1));
    if (err) errors[`socialLinks.${f}`] = err;
  });
  return errors;
}

// ── Main Validator ────────────────────────────
export function validateAthleteForm(values: AthleteFormValues): FormErrors {
  const errors: FormErrors = {};

  // Personal
  if (isBlank(values.firstName))   errors.firstName   = "First name is required.";
  else if (values.firstName.trim().length < 2) errors.firstName = "First name must be at least 2 characters.";

  if (isBlank(values.lastName))    errors.lastName    = "Last name is required.";
  else if (values.lastName.trim().length < 2) errors.lastName = "Last name must be at least 2 characters.";

  const dobErr = validateDate(values.dateOfBirth, "Date of birth", {
    notFuture: true,
    minAge: 5,
    maxAge: 100,
  });
  if (dobErr) errors.dateOfBirth = dobErr;

  if (isBlank(values.gender))      errors.gender      = "Gender is required.";
  if (isBlank(values.nationality)) errors.nationality = "Nationality is required.";

  // Contact
  const emailErr = validateEmail(values.email);
  if (emailErr) errors.email = emailErr;

  const phoneErr = validatePhone(values.phone);
  if (phoneErr) errors.phone = phoneErr;

  // Sport
  if (isBlank(values.primarySportId)) errors.primarySportId = "Primary sport is required.";

  if (values.jerseyNumber !== undefined) {
    if (!Number.isInteger(values.jerseyNumber) || values.jerseyNumber < 0 || values.jerseyNumber > 999) {
      errors.jerseyNumber = "Jersey number must be between 0 and 999.";
    }
  }

  // Agent
  if (!isBlank(values.agentEmail)) {
    const agentEmailErr = validateEmail(values.agentEmail!);
    if (agentEmailErr) errors.agentEmail = agentEmailErr;
  }
  if (!isBlank(values.agentPhone)) {
    const agentPhoneErr = validatePhone(values.agentPhone);
    if (agentPhoneErr) errors.agentPhone = agentPhoneErr;
  }

  // Joined date
  const joinedErr = validateDate(values.joinedDate, "Joined date", { notFuture: false });
  if (joinedErr) errors.joinedDate = joinedErr;

  // Nested validators
  Object.assign(errors, validatePhysicalStats(values.physicalStats));
  Object.assign(errors, validateSocialLinks(values.socialLinks));
  Object.assign(errors, validateEmergencyContacts(values.emergencyContacts));
  Object.assign(errors, validateCareerHistory(values.careerHistory));

  return errors;
}

// ── Section-level Validator ───────────────────
export type FormSection =
  | "personal"
  | "contact"
  | "sport"
  | "physical"
  | "career"
  | "agent"
  | "social"
  | "emergency"
  | "medical";

const SECTION_FIELD_MAP: Record<FormSection, string[]> = {
  personal:  ["firstName", "lastName", "dateOfBirth", "gender", "nationality", "bio"],
  contact:   ["email", "phone", "address"],
  sport:     ["primarySportId", "primaryTeamId", "jerseyNumber", "primaryPositionId"],
  physical:  ["physicalStats"],
  career:    ["careerHistory"],
  agent:     ["agentName", "agentEmail", "agentPhone"],
  social:    ["socialLinks"],
  emergency: ["emergencyContacts"],
  medical:   ["medicalInfo"],
};

export function hasSectionErrors(errors: FormErrors, section: FormSection): boolean {
  const keys = SECTION_FIELD_MAP[section] ?? [];
  return Object.keys(errors).some((k) => keys.some((prefix) => k === prefix || k.startsWith(prefix)));
}

export function getSectionErrors(errors: FormErrors, section: FormSection): FormErrors {
  const keys = SECTION_FIELD_MAP[section] ?? [];
  return Object.fromEntries(
    Object.entries(errors).filter(([k]) => keys.some((prefix) => k === prefix || k.startsWith(prefix)))
  );
}
