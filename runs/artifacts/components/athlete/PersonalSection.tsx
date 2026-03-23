// ─────────────────────────────────────────────
//  Personal Details Section
// ─────────────────────────────────────────────
import React from "react";
import { TextInput, Textarea, Select, AvatarUpload } from "../ui/FormField";
import type { UseAthleteFormReturn } from "../../hooks/useAthleteForm";
import { NATIONALITIES } from "../../lib/athleteDefaults";

interface Props {
  form: UseAthleteFormReturn;
}

const GENDER_OPTIONS = [
  { value: "male",              label: "Male" },
  { value: "female",            label: "Female" },
  { value: "non_binary",        label: "Non-Binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const STATUS_OPTIONS = [
  { value: "active",    label: "Active" },
  { value: "inactive",  label: "Inactive" },
  { value: "injured",   label: "Injured" },
  { value: "retired",   label: "Retired" },
  { value: "suspended", label: "Suspended" },
];

const NATIONALITY_OPTIONS = NATIONALITIES.map((n) => ({ value: n, label: n }));

export function PersonalSection({ form }: Props) {
  const { values, errors, setField } = form;
  const fullName = `${values.firstName} ${values.lastName}`.trim() || "Athlete";

  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <AvatarUpload
          currentUrl={values.avatarUrl}
          name={fullName}
          onChange={(url) => setField("avatarUrl", url)}
          size="lg"
        />
        <div className="flex-1 w-full space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="First Name"
              required
              value={values.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              error={errors.firstName}
              placeholder="e.g. James"
            />
            <TextInput
              label="Last Name"
              required
              value={values.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              error={errors.lastName}
              placeholder="e.g. Mitchell"
            />
          </div>
          <TextInput
            label="Preferred Name / Nickname"
            value={values.preferredName ?? ""}
            onChange={(e) => setField("preferredName", e.target.value)}
            placeholder="e.g. JMitch (optional)"
          />
        </div>
      </div>

      {/* Banner URL */}
      <TextInput
        label="Banner / Cover Image URL"
        value={values.bannerUrl ?? ""}
        onChange={(e) => setField("bannerUrl", e.target.value)}
        placeholder="https://..."
        hint="A wide image displayed at the top of the profile page"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Date of birth */}
        <TextInput
          label="Date of Birth"
          required
          type="date"
          value={values.dateOfBirth}
          onChange={(e) => setField("dateOfBirth", e.target.value)}
          error={errors.dateOfBirth}
          max={new Date().toISOString().split("T")[0]}
        />

        {/* Gender */}
        <Select
          label="Gender"
          required
          value={values.gender}
          onChange={(e) => setField("gender", e.target.value as typeof values.gender)}
          options={GENDER_OPTIONS}
          error={errors.gender}
        />

        {/* Status */}
        <Select
          label="Profile Status"
          required
          value={values.status}
          onChange={(e) => setField("status", e.target.value as typeof values.status)}
          options={STATUS_OPTIONS}
          error={errors.status}
        />

        {/* Nationality */}
        <Select
          label="Primary Nationality"
          required
          value={values.nationality}
          onChange={(e) => setField("nationality", e.target.value)}
          options={NATIONALITY_OPTIONS}
          placeholder="Select nationality"
          error={errors.nationality}
        />

        {/* Secondary nationality */}
        <Select
          label="Secondary Nationality"
          value={values.secondaryNationality ?? ""}
          onChange={(e) => setField("secondaryNationality", e.target.value)}
          options={NATIONALITY_OPTIONS}
          placeholder="None (optional)"
        />

        {/* Joined date */}
        <TextInput
          label="Profile Joined Date"
          required
          type="date"
          value={values.joinedDate}
          onChange={(e) => setField("joinedDate", e.target.value)}
          error={errors.joinedDate}
        />
      </div>

      {/* Bio */}
      <Textarea
        label="Biography"
        value={values.bio ?? ""}
        onChange={(e) => setField("bio", e.target.value)}
        placeholder="A short biography of the athlete — career highlights, background, achievements…"
        rows={4}
        hint="Max 1000 characters recommended"
      />
    </div>
  );
}
