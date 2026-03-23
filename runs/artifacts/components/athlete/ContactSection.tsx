// ─────────────────────────────────────────────
//  Contact Details Section
// ─────────────────────────────────────────────
import React from "react";
import { TextInput, Select } from "../ui/FormField";
import type { UseAthleteFormReturn } from "../../hooks/useAthleteForm";
import { NATIONALITIES } from "../../lib/athleteDefaults";

interface Props {
  form: UseAthleteFormReturn;
}

const COUNTRY_OPTIONS = NATIONALITIES.map((n) => ({ value: n, label: n }));

export function ContactSection({ form }: Props) {
  const { values, errors, setField, setNestedField } = form;
  const addr = values.address ?? { street: "", city: "", state: "", postalCode: "", country: "" };

  return (
    <div className="space-y-6">
      {/* Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Primary Contact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="Email Address"
            required
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            error={errors.email}
            placeholder="athlete@example.com"
          />
          <TextInput
            label="Phone Number"
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)}
            error={errors.phone}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Address
        </h3>
        <div className="space-y-4">
          <TextInput
            label="Street Address"
            value={addr.street ?? ""}
            onChange={(e) => setNestedField("address.street", e.target.value)}
            placeholder="123 Main St, Apt 4B"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TextInput
              label="City"
              value={addr.city}
              onChange={(e) => setNestedField("address.city", e.target.value)}
              placeholder="Los Angeles"
            />
            <TextInput
              label="State / Province"
              value={addr.state ?? ""}
              onChange={(e) => setNestedField("address.state", e.target.value)}
              placeholder="California"
            />
            <TextInput
              label="Postal Code"
              value={addr.postalCode ?? ""}
              onChange={(e) => setNestedField("address.postalCode", e.target.value)}
              placeholder="90001"
            />
          </div>
          <Select
            label="Country"
            value={addr.country}
            onChange={(e) => setNestedField("address.country", e.target.value)}
            options={COUNTRY_OPTIONS}
            placeholder="Select country"
            wrapperClassName="sm:max-w-xs"
          />
        </div>
      </div>
    </div>
  );
}
