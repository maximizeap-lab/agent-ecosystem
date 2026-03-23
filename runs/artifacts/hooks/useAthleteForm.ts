// ─────────────────────────────────────────────
//  useAthleteForm – Form State & Business Logic
// ─────────────────────────────────────────────
import { useState, useCallback, useRef } from "react";
import type {
  AthleteFormValues,
  FormErrors,
  EmergencyContact,
  CareerEntry,
  PhysicalStats,
  SocialLinks,
  MedicalInfo,
  FormSection,
} from "../types/athlete";
import { validateAthleteForm, hasSectionErrors } from "../lib/athleteValidation";
import { createAthleteDefaults } from "../lib/athleteDefaults";

// Re-export so callers don't need two imports
export type { FormSection };

interface UseAthleteFormOptions {
  initialValues?: Partial<AthleteFormValues>;
  onSubmit: (values: AthleteFormValues) => Promise<void>;
}

export interface UseAthleteFormReturn {
  values: AthleteFormValues;
  errors: FormErrors;
  touched: Partial<Record<string, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
  activeSection: FormSection;
  setActiveSection: (s: FormSection) => void;
  sectionHasErrors: (s: FormSection) => boolean;

  // Field setters
  setField: <K extends keyof AthleteFormValues>(field: K, value: AthleteFormValues[K]) => void;
  setNestedField: (path: string, value: unknown) => void;
  touchField: (path: string) => void;

  // Emergency contacts
  addEmergencyContact: () => void;
  updateEmergencyContact: (index: number, field: keyof EmergencyContact, value: string) => void;
  removeEmergencyContact: (index: number) => void;

  // Career history
  addCareerEntry: () => void;
  updateCareerEntry: (index: number, field: keyof CareerEntry, value: unknown) => void;
  removeCareerEntry: (index: number) => void;

  // Physical stats
  updatePhysicalStats: (field: keyof PhysicalStats, value: unknown) => void;

  // Social links
  updateSocialLink: (field: keyof SocialLinks, value: string) => void;

  // Medical
  updateMedicalInfo: (field: keyof MedicalInfo, value: unknown) => void;

  // Actions
  handleSubmit: () => Promise<void>;
  handleReset: () => void;
  validateSection: (s: FormSection) => boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setDeepValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...obj };
  let curr: Record<string, unknown> = result;
  for (let i = 0; i < keys.length - 1; i++) {
    curr[keys[i]] = { ...(curr[keys[i]] as Record<string, unknown>) };
    curr = curr[keys[i]] as Record<string, unknown>;
  }
  curr[keys[keys.length - 1]] = value;
  return result;
}

export function useAthleteForm({
  initialValues,
  onSubmit,
}: UseAthleteFormOptions): UseAthleteFormReturn {
  const defaults = createAthleteDefaults();
  const initial: AthleteFormValues = { ...defaults, ...initialValues };

  const [values, setValues] = useState<AthleteFormValues>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<FormSection>("personal");

  const initialRef = useRef(initial);

  // ── Setters ───────────────────────────────
  const setField = useCallback(
    <K extends keyof AthleteFormValues>(field: K, value: AthleteFormValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        setIsDirty(JSON.stringify(next) !== JSON.stringify(initialRef.current));
        return next;
      });
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    []
  );

  const setNestedField = useCallback((path: string, value: unknown) => {
    setValues((prev) => {
      const next = setDeepValue(prev as unknown as Record<string, unknown>, path, value) as unknown as AthleteFormValues;
      setIsDirty(JSON.stringify(next) !== JSON.stringify(initialRef.current));
      return next;
    });
    setTouched((prev) => ({ ...prev, [path]: true }));
  }, []);

  const touchField = useCallback((path: string) => {
    setTouched((prev) => ({ ...prev, [path]: true }));
  }, []);

  // ── Emergency Contacts ────────────────────
  const addEmergencyContact = useCallback(() => {
    const blank: EmergencyContact = { id: generateId(), name: "", relationship: "", phone: "", email: "" };
    setValues((prev) => ({ ...prev, emergencyContacts: [...prev.emergencyContacts, blank] }));
    setIsDirty(true);
  }, []);

  const updateEmergencyContact = useCallback(
    (index: number, field: keyof EmergencyContact, value: string) => {
      setValues((prev) => {
        const contacts = prev.emergencyContacts.map((c, i) =>
          i === index ? { ...c, [field]: value } : c
        );
        return { ...prev, emergencyContacts: contacts };
      });
      setTouched((prev) => ({ ...prev, [`emergencyContacts[${index}].${field}`]: true }));
      setIsDirty(true);
    },
    []
  );

  const removeEmergencyContact = useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Career History ────────────────────────
  const addCareerEntry = useCallback(() => {
    const blank: CareerEntry = {
      id: generateId(),
      teamName: "",
      sportName: "",
      startDate: "",
      endDate: undefined,
      jerseyNumber: undefined,
      notes: "",
    };
    setValues((prev) => ({ ...prev, careerHistory: [...prev.careerHistory, blank] }));
    setIsDirty(true);
  }, []);

  const updateCareerEntry = useCallback(
    (index: number, field: keyof CareerEntry, value: unknown) => {
      setValues((prev) => {
        const history = prev.careerHistory.map((e, i) =>
          i === index ? { ...e, [field]: value } : e
        );
        return { ...prev, careerHistory: history };
      });
      setTouched((prev) => ({ ...prev, [`careerHistory[${index}].${field}`]: true }));
      setIsDirty(true);
    },
    []
  );

  const removeCareerEntry = useCallback((index: number) => {
    setValues((prev) => ({
      ...prev,
      careerHistory: prev.careerHistory.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  // ── Physical Stats ────────────────────────
  const updatePhysicalStats = useCallback(
    (field: keyof PhysicalStats, value: unknown) => {
      setValues((prev) => ({
        ...prev,
        physicalStats: { ...prev.physicalStats, [field]: value },
      }));
      setTouched((prev) => ({ ...prev, [`physicalStats.${field}`]: true }));
      setIsDirty(true);
    },
    []
  );

  // ── Social Links ──────────────────────────
  const updateSocialLink = useCallback((field: keyof SocialLinks, value: string) => {
    setValues((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [field]: value },
    }));
    setTouched((prev) => ({ ...prev, [`socialLinks.${field}`]: true }));
    setIsDirty(true);
  }, []);

  // ── Medical ───────────────────────────────
  const updateMedicalInfo = useCallback((field: keyof MedicalInfo, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      medicalInfo: { ...prev.medicalInfo, [field]: value },
    }));
    setTouched((prev) => ({ ...prev, [`medicalInfo.${field}`]: true }));
    setIsDirty(true);
  }, []);

  // ── Validation ────────────────────────────
  const validateSection = useCallback(
    (section: FormSection): boolean => {
      const errs = validateAthleteForm(values);
      setErrors(errs);
      return !hasSectionErrors(errs, section);
    },
    [values]
  );

  const sectionHasErrors = useCallback(
    (section: FormSection): boolean => hasSectionErrors(errors, section),
    [errors]
  );

  // ── Submit ────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const allTouched: Partial<Record<string, boolean>> = {};
    const walkKeys = (obj: unknown, prefix = "") => {
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        Object.keys(obj as object).forEach((k) => {
          const path = prefix ? `${prefix}.${k}` : k;
          allTouched[path] = true;
          walkKeys((obj as Record<string, unknown>)[k], path);
        });
      }
    };
    walkKeys(values);
    setTouched(allTouched);

    const errs = validateAthleteForm(values);
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Jump to first section with errors
      const sections: FormSection[] = [
        "personal", "contact", "sport", "physical", "career", "agent", "social", "emergency", "medical",
      ];
      const firstBad = sections.find((s) => hasSectionErrors(errs, s));
      if (firstBad) setActiveSection(firstBad);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      setIsDirty(false);
      initialRef.current = values;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  const handleReset = useCallback(() => {
    setValues(initial);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setActiveSection("personal");
  }, [initial]);

  return {
    values,
    errors,
    touched,
    isDirty,
    isSubmitting,
    activeSection,
    setActiveSection,
    sectionHasErrors,
    setField,
    setNestedField,
    touchField,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    addCareerEntry,
    updateCareerEntry,
    removeCareerEntry,
    updatePhysicalStats,
    updateSocialLink,
    updateMedicalInfo,
    handleSubmit,
    handleReset,
    validateSection,
  };
}
