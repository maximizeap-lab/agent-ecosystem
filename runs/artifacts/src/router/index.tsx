import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";

import { RootLayout } from "@layouts/RootLayout";
import { AuthLayout } from "@layouts/AuthLayout";
import { DashboardLayout } from "@layouts/DashboardLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { RoleGuard } from "./RoleGuard";
import { PageLoader } from "@components/ui/PageLoader";
import { ROUTES } from "@constants/index";

// ─── Lazy-loaded Page Imports ─────────────────────────────────────────────────

// Auth Pages
const LoginPage = lazy(() => import("@pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(
  () => import("@pages/auth/ForgotPasswordPage")
);
const ResetPasswordPage = lazy(() => import("@pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@pages/auth/VerifyEmailPage"));

// Dashboard
const DashboardPage = lazy(() => import("@pages/dashboard/DashboardPage"));

// Users
const UsersListPage = lazy(() => import("@pages/users/UsersListPage"));
const UserCreatePage = lazy(() => import("@pages/users/UserCreatePage"));
const UserDetailPage = lazy(() => import("@pages/users/UserDetailPage"));
const UserEditPage = lazy(() => import("@pages/users/UserEditPage"));

// Content
const ContentListPage = lazy(() => import("@pages/content/ContentListPage"));
const ContentCreatePage = lazy(
  () => import("@pages/content/ContentCreatePage")
);
const ContentDetailPage = lazy(
  () => import("@pages/content/ContentDetailPage")
);
const ContentEditPage = lazy(() => import("@pages/content/ContentEditPage"));

// Analytics
const AnalyticsOverviewPage = lazy(
  () => import("@pages/analytics/AnalyticsOverviewPage")
);
const AnalyticsReportsPage = lazy(
  () => import("@pages/analytics/AnalyticsReportsPage")
);

// Settings
const SettingsLayout = lazy(() => import("@layouts/SettingsLayout"));
const ProfileSettingsPage = lazy(
  () => import("@pages/settings/ProfileSettingsPage")
);
const SecuritySettingsPage = lazy(
  () => import("@pages/settings/SecuritySettingsPage")
);
const NotificationSettingsPage = lazy(
  () => import("@pages/settings/NotificationSettingsPage")
);
const AppearanceSettingsPage = lazy(
  () => import("@pages/settings/AppearanceSettingsPage")
);

// Error Pages
const NotFoundPage = lazy(() => import("@pages/errors/NotFoundPage"));
const ForbiddenPage = lazy(() => import("@pages/errors/ForbiddenPage"));
const ServerErrorPage = lazy(() => import("@pages/errors/ServerErrorPage"));

// ─── Suspense Wrapper ─────────────────────────────────────────────────────────

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// ─── Router Configuration ─────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // errorElement: <RootErrorBoundary />,  // uncomment to add error boundary
    children: [
      // ── Public / Auth Routes ────────────────────────────────────────────────
      {
        element: <PublicRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: ROUTES.LOGIN,
                element: withSuspense(LoginPage),
              },
              {
                path: ROUTES.REGISTER,
                element: withSuspense(RegisterPage),
              },
              {
                path: ROUTES.FORGOT_PASSWORD,
                element: withSuspense(ForgotPasswordPage),
              },
              {
                path: ROUTES.RESET_PASSWORD,
                element: withSuspense(ResetPasswordPage),
              },
              {
                path: ROUTES.VERIFY_EMAIL,
                element: withSuspense(VerifyEmailPage),
              },
            ],
          },
        ],
      },

      // ── Protected Routes ────────────────────────────────────────────────────
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              // Dashboard
              {
                index: true,
                path: ROUTES.DASHBOARD,
                element: withSuspense(DashboardPage),
              },

              // Users Module — requires admin or manager role
              {
                path: ROUTES.USERS,
                element: (
                  <RoleGuard requiredPermissions={["read:users"]}>
                    <Suspense fallback={<PageLoader />}>
                      <UsersListPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.USERS_CREATE,
                element: (
                  <RoleGuard requiredPermissions={["write:users"]}>
                    <Suspense fallback={<PageLoader />}>
                      <UserCreatePage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.USERS_DETAIL,
                element: (
                  <RoleGuard requiredPermissions={["read:users"]}>
                    <Suspense fallback={<PageLoader />}>
                      <UserDetailPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.USERS_EDIT,
                element: (
                  <RoleGuard requiredPermissions={["write:users"]}>
                    <Suspense fallback={<PageLoader />}>
                      <UserEditPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },

              // Content Module
              {
                path: ROUTES.CONTENT,
                element: (
                  <RoleGuard requiredPermissions={["read:content"]}>
                    <Suspense fallback={<PageLoader />}>
                      <ContentListPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.CONTENT_CREATE,
                element: (
                  <RoleGuard requiredPermissions={["write:content"]}>
                    <Suspense fallback={<PageLoader />}>
                      <ContentCreatePage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.CONTENT_DETAIL,
                element: (
                  <RoleGuard requiredPermissions={["read:content"]}>
                    <Suspense fallback={<PageLoader />}>
                      <ContentDetailPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.CONTENT_EDIT,
                element: (
                  <RoleGuard requiredPermissions={["write:content"]}>
                    <Suspense fallback={<PageLoader />}>
                      <ContentEditPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },

              // Analytics Module
              {
                path: ROUTES.ANALYTICS,
                element: (
                  <RoleGuard requiredPermissions={["read:analytics"]}>
                    <Suspense fallback={<PageLoader />}>
                      <AnalyticsOverviewPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.ANALYTICS_OVERVIEW,
                element: (
                  <RoleGuard requiredPermissions={["read:analytics"]}>
                    <Suspense fallback={<PageLoader />}>
                      <AnalyticsOverviewPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },
              {
                path: ROUTES.ANALYTICS_REPORTS,
                element: (
                  <RoleGuard requiredPermissions={["read:analytics"]}>
                    <Suspense fallback={<PageLoader />}>
                      <AnalyticsReportsPage />
                    </Suspense>
                  </RoleGuard>
                ),
              },

              // Settings Module (nested)
              {
                path: ROUTES.SETTINGS,
                element: (
                  <Suspense fallback={<PageLoader />}>
                    <SettingsLayout />
                  </Suspense>
                ),
                children: [
                  {
                    index: true,
                    element: (
                      <Suspense fallback={<PageLoader />}>
                        <ProfileSettingsPage />
                      </Suspense>
                    ),
                  },
                  {
                    path: ROUTES.SETTINGS_PROFILE,
                    element: (
                      <Suspense fallback={<PageLoader />}>
                        <ProfileSettingsPage />
                      </Suspense>
                    ),
                  },
                  {
                    path: ROUTES.SETTINGS_SECURITY,
                    element: (
                      <Suspense fallback={<PageLoader />}>
                        <SecuritySettingsPage />
                      </Suspense>
                    ),
                  },
                  {
                    path: ROUTES.SETTINGS_NOTIFICATIONS,
                    element: (
                      <Suspense fallback={<PageLoader />}>
                        <NotificationSettingsPage />
                      </Suspense>
                    ),
                  },
                  {
                    path: ROUTES.SETTINGS_APPEARANCE,
                    element: (
                      <Suspense fallback={<PageLoader />}>
                        <AppearanceSettingsPage />
                      </Suspense>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },

      // ── Error Routes ────────────────────────────────────────────────────────
      {
        path: ROUTES.NOT_FOUND,
        element: withSuspense(NotFoundPage),
      },
      {
        path: ROUTES.FORBIDDEN,
        element: withSuspense(ForbiddenPage),
      },
      {
        path: ROUTES.SERVER_ERROR,
        element: withSuspense(ServerErrorPage),
      },

      // ── Catch-all (404) ─────────────────────────────────────────────────────
      {
        path: "*",
        element: withSuspense(NotFoundPage),
      },
    ],
  },
]);

// ─── Router Provider Export ───────────────────────────────────────────────────

export function AppRouter() {
  return <RouterProvider router={router} />;
}
