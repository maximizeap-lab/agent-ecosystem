"use client";
// ─────────────────────────────────────────────────────────────
//  LoginForm — Full-featured login UI
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { LoginCredentials } from "../../types/auth.types";

const DEMO_ACCOUNTS = [
  { label: "Admin",   email: "admin@dashboard.io",   password: "Admin@123",   color: "bg-purple-100 text-purple-800 border-purple-200" },
  { label: "Coach",   email: "coach@dashboard.io",   password: "Coach@123",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  { label: "Athlete", email: "athlete@dashboard.io", password: "Athlete@123", color: "bg-green-100 text-green-800 border-green-200" },
];

export function LoginForm() {
  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<LoginCredentials>({
    email: "",
    password: "",
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginCredentials>>({});

  // Redirect when already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const next = searchParams.get("next") ?? getRoleDefaultPath(user.role);
      router.replace(next);
    }
  }, [isAuthenticated, user]);

  // Clear API error when user edits fields
  useEffect(() => {
    if (error) clearError();
  }, [form.email, form.password]);

  const validate = (): boolean => {
    const errors: Partial<LoginCredentials> = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Enter a valid email address";
    }
    if (form.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(form);
      // Redirect handled in the useEffect above
    } catch {
      // Error is in auth state
    }
  };

  const fillDemo = (email: string, password: string) => {
    setForm((f) => ({ ...f, email, password }));
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white text-2xl font-bold mb-4 shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SportsDash</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Demo accounts */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">
            Demo accounts
          </p>
          <div className="flex gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email, a.password)}
                className={`flex-1 text-xs font-medium py-2 px-3 rounded-lg border cursor-pointer transition-all hover:opacity-80 ${a.color}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200 p-8">
          {/* Global error */}
          {error && (
            <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <span className="text-red-500 text-base mt-0.5">⚠</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  ${fieldErrors.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm transition-colors outline-none
                    focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    ${fieldErrors.password ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rememberMe: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                Keep me signed in
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                text-white text-sm font-semibold transition-colors shadow-sm shadow-indigo-200
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-indigo-600 font-medium hover:underline cursor-pointer"
          >
            Request access
          </button>
        </p>
      </div>
    </div>
  );
}

function getRoleDefaultPath(role?: string): string {
  switch (role) {
    case "admin":   return "/dashboard/admin";
    case "coach":   return "/dashboard/coach";
    case "athlete": return "/dashboard/athlete";
    default:        return "/dashboard";
  }
}
