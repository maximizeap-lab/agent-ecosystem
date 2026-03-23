"use client";
// ─────────────────────────────────────────────────────────────
//  RegisterForm — New user sign-up UI
// ─────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { RegisterPayload, Role } from "../../types/auth.types";

const ROLE_OPTIONS: { value: Role; label: string; description: string; icon: string }[] =
  [
    {
      value: "athlete",
      label: "Athlete",
      description: "Track your performance and follow training plans",
      icon: "🏃",
    },
    {
      value: "coach",
      label: "Coach",
      description: "Manage athletes, create plans and view analytics",
      icon: "📋",
    },
  ];

interface FormState extends RegisterPayload {
  confirmPassword: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

export function RegisterForm() {
  const { register, isLoading, error, clearError } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "athlete",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (error) clearError();
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!form.firstName.trim()) errors.firstName = "First name is required";
    if (!form.lastName.trim()) errors.lastName = "Last name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      errors.email = "Enter a valid email address";
    if (form.password.length < 8)
      errors.password = "Password must be at least 8 characters";
    if (!/[A-Z]/.test(form.password))
      errors.password = "Must contain an uppercase letter";
    if (!/[0-9]/.test(form.password))
      errors.password = "Must contain a number";
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      // AuthContext redirects on success
    } catch {
      // error is in auth state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join SportsDash and start tracking performance
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200 p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-red-500">⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Role picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`relative flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all
                      ${form.role === opt.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={form.role === opt.value}
                      onChange={() => update("role", opt.value)}
                      className="sr-only"
                    />
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-semibold text-sm text-gray-900">
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight">
                      {opt.description}
                    </span>
                    {form.role === opt.value && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                        ✓
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="First name"
                id="firstName"
                value={form.firstName}
                onChange={(v) => update("firstName", v)}
                error={fieldErrors.firstName}
                placeholder="Alex"
                autoComplete="given-name"
              />
              <Field
                label="Last name"
                id="lastName"
                value={form.lastName}
                onChange={(v) => update("lastName", v)}
                error={fieldErrors.lastName}
                placeholder="Reed"
                autoComplete="family-name"
              />
            </div>

            {/* Email */}
            <Field
              label="Email address"
              id="email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              error={fieldErrors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm outline-none transition-colors
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    ${fieldErrors.password ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
              )}
              {/* Strength indicator */}
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm password */}
            <Field
              label="Confirm password"
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(v) => update("confirmPassword", v)}
              error={fieldErrors.confirmPassword}
              placeholder="Repeat password"
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                text-white text-sm font-semibold transition-colors shadow-sm
                flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-indigo-600 font-medium hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

interface FieldProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  autoComplete?: string;
}

function Field({ label, id, type = "text", value, onChange, error, placeholder, autoComplete }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-colors
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${error ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12,
  ].filter(Boolean).length;

  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-lime-400", "bg-green-500"];
  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${n <= score ? colors[score - 1] : "bg-gray-200"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score >= 3 ? "text-green-600" : "text-gray-400"}`}>
        {labels[score - 1] ?? ""}
      </p>
    </div>
  );
}
