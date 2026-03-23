import { NavLink, Outlet } from "react-router-dom";
import {
  User,
  Shield,
  Bell,
  Palette,
} from "lucide-react";
import { ROUTES } from "@constants/index";
import { clsx } from "clsx";
import { usePageMeta } from "@hooks/usePageMeta";

const settingsNav = [
  {
    label: "Profile",
    path: ROUTES.SETTINGS_PROFILE,
    icon: User,
  },
  {
    label: "Security",
    path: ROUTES.SETTINGS_SECURITY,
    icon: Shield,
  },
  {
    label: "Notifications",
    path: ROUTES.SETTINGS_NOTIFICATIONS,
    icon: Bell,
  },
  {
    label: "Appearance",
    path: ROUTES.SETTINGS_APPEARANCE,
    icon: Palette,
  },
];

/**
 * SettingsLayout — Two-column layout (left nav + right content panel)
 * used for all /settings/* pages.
 */
export default function SettingsLayout() {
  usePageMeta({
    title: "Settings",
    breadcrumbs: [{ label: "Dashboard", path: ROUTES.DASHBOARD }, { label: "Settings" }],
  });

  return (
    <div className="settings-layout">
      {/* Left sidebar */}
      <aside className="settings-layout__nav" aria-label="Settings navigation">
        <h2 className="settings-layout__nav-title">Settings</h2>
        <nav>
          <ul role="list" className="settings-layout__nav-list">
            {settingsNav.map(({ label, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    clsx("settings-layout__nav-item", {
                      "settings-layout__nav-item--active": isActive,
                    })
                  }
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Right content */}
      <div className="settings-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
