import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/authStore";
import { ROUTES } from "@constants/index";
import { PageLoader } from "@components/ui/PageLoader";

/**
 * ProtectedRoute — Wraps routes that require authentication.
 *
 * Behaviour:
 *  - If the auth state is still loading (e.g. rehydrating from storage /
 *    verifying token with the API) → show a full-page loader.
 *  - If the user is NOT authenticated → redirect to /login, preserving the
 *    originally requested URL in `state.from` so we can send them back after
 *    a successful login.
 *  - Otherwise → render nested routes via <Outlet />.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
}
