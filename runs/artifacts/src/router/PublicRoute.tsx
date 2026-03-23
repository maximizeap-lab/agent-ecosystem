import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@constants/index";

/**
 * PublicRoute — Wraps routes that are only accessible to unauthenticated users
 * (e.g. Login, Register).
 *
 * Behaviour:
 *  - If the user IS authenticated → redirect to the dashboard (or wherever
 *    they originally came from, stored in `state.from`).
 *  - Otherwise → render nested routes via <Outlet />.
 */
export function PublicRoute() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Redirect to the page the user was trying to visit, falling back to /dashboard
  const destination =
    (location.state as { from?: Location })?.from?.pathname ?? ROUTES.DASHBOARD;

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
