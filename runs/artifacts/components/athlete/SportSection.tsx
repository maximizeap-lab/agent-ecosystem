// ─────────────────────────────────────────────
//  Sport & Team Section
// ─────────────────────────────────────────────
import React from "react";
import { TextInput, Select, NumberInput } from "../ui/FormField";
import type { UseAthleteFormReturn } from "../../hooks/useAthleteForm";
import { SPORTS, TEAMS, POSITIONS } from "../../lib/athleteDefaults";

interface Props {
  form: UseAthleteFormReturn;
}

export function SportSection({ form }: Props) {
  const { values, errors, setField } = form;

  const sportOptions = SPORTS.map((s) => ({ value: s.id, label: s.name }));

  const teamOptions = values.primarySportId
    ? TEAMS.filter((t) => t.sportId === values.primarySportId).map((t) => ({
        value: t.id,
        label: `${t.name} (${t.league ?? t.division ?? ""})`,
      }))
    : [];

  const positionOptions = values.primarySportId
    ? (POSITIONS[values.primarySportId] ?? []).map((p) => ({
        value: p.id,
        label: `${p.name} (${p.abbreviation})`,
      }))
    : [];

  const selectedTeam = values.primaryTeamId
    ? TEAMS.find((t) => t.id === values.primaryTeamId)
    : undefined;

  return (
    <div className="space-y-8">
      {/* Sport */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Primary Sport
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Sport"
            required
            value={values.primarySportId}
            onChange={(e) => {
              setField("primarySportId", e.target.value);
              setField("primaryTeamId", "");
              setField("primaryPositionId", "");
              setField("secondaryPositionId", "");
            }}
            options={sportOptions}
            placeholder="Select a sport"
            error={errors.primarySportId}
          />

          <Select
            label="Primary Position"
            value={values.primaryPositionId ?? ""}
            onChange={(e) => setField("primaryPositionId", e.target.value)}
            options={positionOptions}
            placeholder={values.primarySportId ? "Select position" : "Select sport first"}
            disabled={!values.primarySportId || positionOptions.length === 0}
          />

          <Select
            label="Secondary Position"
            value={values.secondaryPositionId ?? ""}
            onChange={(e) => setField("secondaryPositionId", e.target.value)}
            options={positionOptions}
            placeholder={values.primarySportId ? "None (optional)" : "Select sport first"}
            disabled={!values.primarySportId || positionOptions.length === 0}
            hint="Optional secondary / utility position"
          />
        </div>
      </div>

      {/* Team */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Current Team
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Team"
            value={values.primaryTeamId ?? ""}
            onChange={(e) => setField("primaryTeamId", e.target.value)}
            options={teamOptions}
            placeholder={
              values.primarySportId
                ? teamOptions.length === 0
                  ? "No teams available"
                  : "Select team"
                : "Select sport first"
            }
            disabled={!values.primarySportId || teamOptions.length === 0}
            hint="Teams are filtered by selected sport"
          />

          <NumberInput
            label="Jersey Number"
            value={values.jerseyNumber ?? ""}
            onChange={(e) =>
              setField(
                "jerseyNumber",
                e.target.value === "" ? undefined : Number(e.target.value)
              )
            }
            error={errors.jerseyNumber as string | undefined}
            min={0}
            max={999}
            placeholder="e.g. 23"
          />
        </div>

        {/* Team detail card */}
        {selectedTeam && (
          <div className="mt-4 flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {selectedTeam.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selectedTeam.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedTeam.city}, {selectedTeam.country}
                {selectedTeam.league ? ` · ${selectedTeam.league}` : ""}
                {selectedTeam.division ? ` · ${selectedTeam.division}` : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Agent */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Agent / Representative
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TextInput
            label="Agent Name"
            value={values.agentName ?? ""}
            onChange={(e) => setField("agentName", e.target.value)}
            placeholder="Full name"
          />
          <TextInput
            label="Agent Email"
            type="email"
            value={values.agentEmail ?? ""}
            onChange={(e) => setField("agentEmail", e.target.value)}
            error={errors.agentEmail as string | undefined}
            placeholder="agent@agency.com"
          />
          <TextInput
            label="Agent Phone"
            type="tel"
            value={values.agentPhone ?? ""}
            onChange={(e) => setField("agentPhone", e.target.value)}
            error={errors.agentPhone as string | undefined}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>
    </div>
  );
}
