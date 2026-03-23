"use client";
// ─────────────────────────────────────────────────────────────
//  DashboardShell — Sidebar + topbar layout with role-aware nav
// ─────────────────────────────────────────────────────────────

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { PermissionGate } from "../auth/ProtectedRoute";
import { Role, Permission } from "../../types/auth.types";

// ── Nav item definition ──────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permission?: Permission;
  minRole?: Role;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  // Everyone
  { label: "Overview",      href: "/dashboard",                 icon: "🏠" },

  // Athlete
  { label: "My Training",   href: "/dashboard/training",        icon: "💪", permission: "plan:read" },
  { label: "My Stats",      href: "/dashboard/stats",           icon: "📊", permission: "performance:read" },

  // Coach + Admin
  { label: "Athletes",      href: "/dashboard/athletes",        icon: "👥", permission: "athlete:read", minRole: "coach" },
  { label: "Training Plans",href: "/dashboard/plans",           icon: "📋", permission: "plan:create",  minRole: "coach" },
  { label: "Analytics",     href: "/dashboard/analytics",       icon: "📈", permission: "analytics:advanced", minRole: "coach" },
  { label: "Reports",       href: "/dashboard/reports",         icon: "📑", permission: "performance:export", minRole: "coach" },

  // Admin only
  { label: "User Management",href: "/dashboard/users",          icon: "🔑", permission: "user:create",  minRole: "admin" },
  { label: "System",        href: "/dashboard/system",          icon: "⚙️",  permission: "system:settings", minRole: "admin" },
  { label: "Audit Log",     href: "/dashboard/audit",           icon: "🗒️",  permission: "system:audit_log", minRole: "admin" },
  { label: "Billing",       href: "/dashboard/billing",         icon: "💳",  permission: "system:billing",  minRole: "admin" },
];

const ROLE_COLORS: Record<Role, string> = {
  admin:   "bg-purple-100 text-purple-700",
  coach:   "bg-blue-100 text-blue-700",
  athlete: "bg-green-100 text-green-700",
};

const ROLE_LABELS: Record<Role, string> = {
  admin:   "Administrator",
  coach:   "Coach",
  athlete: "Athlete",
};

// ── Shell ────────────────────────────────────────────────────

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    // Router push handled by ProtectedRoute when user becomes null
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Mobile overlay ──────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 shadow-sm z-30
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
            S
          </div>
          <span className="font-bold text-gray-900 text-lg">SportsDash</span>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                alt={`${user.firstName} avatar`}
                className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-600
              hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer font-medium"
          >
            <span>🚪</span>
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 h-14 flex items-center px-4 gap-4">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            ☰
          </button>

          <div className="flex-1" />

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <PermissionGate permission="performance:write">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                + Log Session
              </button>
            </PermissionGate>

            <PermissionGate minRole="coach">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer">
                + Add Athlete
              </button>
            </PermissionGate>

            {/* Notification bell */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Avatar */}
            {user && (
              <img
                src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.firstName}`}
                alt="avatar"
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:border-indigo-400 transition-colors"
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// ── NavLink helper ───────────────────────────────────────────

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const guard: { permission?: Permission; minRole?: Role } = {
    permission: item.permission,
    minRole: item.minRole,
  };

  return (
    <PermissionGate
      permission={item.permission}
      minRole={item.minRole}
    >
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
          ${active
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
      >
        <span className="text-base">{item.icon}</span>
        <span className="flex-1">{item.label}</span>
        {item.badge !== undefined && (
          <span className="bg-indigo-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    </PermissionGate>
  );
}
