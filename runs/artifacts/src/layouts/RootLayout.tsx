import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useTheme } from "@hooks/useTheme";

/**
 * RootLayout — The top-level layout wrapping the entire application.
 *
 * Responsibilities:
 *  - Initialise the theme (class on <html>).
 *  - Render the global toast notification container.
 *  - Provide the <Outlet /> where child route layouts are mounted.
 */
export function RootLayout() {
  const { isDark } = useTheme();

  return (
    <div className="root-layout" data-testid="root-layout">
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "8px",
            background: isDark ? "#1e293b" : "#ffffff",
            color: isDark ? "#f8fafc" : "#0f172a",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#ffffff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
        }}
      />

      {/* Child layouts / pages */}
      <Outlet />
    </div>
  );
}
