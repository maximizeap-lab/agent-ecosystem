import { Menu, Sun, Moon, Monitor, Search, Bell } from "lucide-react";
import { useUIStore } from "@store/uiStore";
import { useTheme } from "@hooks/useTheme";
import { Breadcrumbs } from "@components/ui/Breadcrumbs";
import type { ThemeMode } from "@types/index";

const themeIcons: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
  system: <Monitor size={18} />,
};

/**
 * Header — Sticky top bar containing: hamburger, breadcrumbs, search,
 * notifications, and the theme toggle.
 */
export function Header() {
  const { setSidebarMobileOpen, sidebarMobileOpen, pageTitle } = useUIStore();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header" data-testid="header">
      <div className="header__left">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
          className="header__menu-btn"
          aria-label="Toggle navigation"
          aria-expanded={sidebarMobileOpen}
        >
          <Menu size={22} />
        </button>

        <div className="header__breadcrumbs">
          <Breadcrumbs />
          {pageTitle && (
            <h1 className="header__page-title sr-only">{pageTitle}</h1>
          )}
        </div>
      </div>

      <div className="header__right">
        {/* Search */}
        <button className="header__icon-btn" aria-label="Search">
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button className="header__icon-btn header__icon-btn--relative" aria-label="Notifications">
          <Bell size={18} />
          <span className="header__notification-dot" aria-hidden="true" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="header__icon-btn"
          aria-label={`Switch theme (current: ${theme})`}
          title={`Theme: ${theme}`}
        >
          {themeIcons[theme]}
        </button>
      </div>
    </header>
  );
}
