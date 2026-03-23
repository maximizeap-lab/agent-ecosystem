import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { useUIStore } from "@store/uiStore";
import { useAuth } from "@hooks/useAuth";
import { usePermission } from "@hooks/usePermission";
import { ROUTES, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH, APP_NAME } from "@constants/index";
import type { NavItem } from "@types/index";

// ─── Nav configuration ────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: ROUTES.DASHBOARD,
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: "Users",
    path: ROUTES.USERS,
    icon: <Users size={20} />,
    requiredPermissions: ["read:users"],
  },
  {
    label: "Content",
    path: ROUTES.CONTENT,
    icon: <FileText size={20} />,
    requiredPermissions: ["read:content"],
  },
  {
    label: "Analytics",
    path: ROUTES.ANALYTICS,
    icon: <BarChart2 size={20} />,
    requiredPermissions: ["read:analytics"],
  },
  {
    label: "Settings",
    path: ROUTES.SETTINGS,
    icon: <Settings size={20} />,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, sidebarMobileOpen } = useUIStore();
  const { logout, user } = useAuth();
  const { canAny } = usePermission();
  const location = useLocation();

  const width = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const filteredNav = navItems.filter((item) =>
    !item.requiredPermissions?.length ||
    canAny(...(item.requiredPermissions ?? []))
  );

  return (
    <aside
      className={clsx("sidebar", {
        "sidebar--collapsed": sidebarCollapsed,
        "sidebar--mobile-open": sidebarMobileOpen,
      })}
      style={{ width }}
      aria-label="Main navigation"
      data-testid="sidebar"
    >
      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="sidebar__brand">
        <span className="sidebar__brand-logo" aria-label={APP_NAME}>⬡</span>
        {!sidebarCollapsed && (
          <span className="sidebar__brand-name">{APP_NAME}</span>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="sidebar__nav" aria-label="Primary">
        <ul role="list" className="sidebar__nav-list">
          {filteredNav.map((item) => {
            const isActive =
              item.path === ROUTES.DASHBOARD
                ? location.pathname === ROUTES.DASHBOARD
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={clsx("sidebar__nav-item", {
                    "sidebar__nav-item--active": isActive,
                  })}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="sidebar__nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <span className="sidebar__nav-label">{item.label}</span>
                  )}
                  {item.badge && !sidebarCollapsed && (
                    <span className="sidebar__nav-badge">{item.badge}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User area + collapse toggle ────────────────────────────────────── */}
      <div className="sidebar__footer">
        {user && (
          <div className="sidebar__user">
            <div className="sidebar__user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
              ) : (
                <span>{user.firstName[0]}{user.lastName[0]}</span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar__user-info">
                <p className="sidebar__user-name">
                  {user.firstName} {user.lastName}
                </p>
                <p className="sidebar__user-role">{user.role}</p>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="sidebar__logout-btn"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="sidebar__collapse-btn"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </div>
    </aside>
  );
}
