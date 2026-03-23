import { Outlet } from "react-router-dom";
import { Sidebar } from "@components/navigation/Sidebar";
import { Header } from "@components/navigation/Header";
import { useUIStore } from "@store/uiStore";
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "@constants/index";
import { clsx } from "clsx";

/**
 * DashboardLayout — The main shell for all authenticated, protected pages.
 *
 * Renders:
 *  - A collapsible sidebar (fixed left).
 *  - A sticky top header.
 *  - The page content area via <Outlet />.
 */
export function DashboardLayout() {
  const { sidebarCollapsed, sidebarMobileOpen } = useUIStore();

  const contentMargin = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="dashboard-layout" data-testid="dashboard-layout">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="dashboard-layout__overlay"
          onClick={() => useUIStore.getState().setSidebarMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div
        className={clsx("dashboard-layout__main")}
        style={{ marginLeft: `${contentMargin}px` }}
      >
        <Header />

        <main className="dashboard-layout__content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
