import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import { ROUTES } from "@constants/index";

/**
 * useNavigator — A thin wrapper around react-router-dom's navigation hooks.
 *
 * Provides typed helpers for every named route so we never hard-code paths
 * outside of `ROUTES` and `constants/index.ts`.
 */
export function useNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Generic helpers ────────────────────────────────────────────────────────

  const goBack = useCallback(() => navigate(-1), [navigate]);
  const goForward = useCallback(() => navigate(1), [navigate]);

  // ── Named-route helpers ────────────────────────────────────────────────────

  const goDashboard = useCallback(
    () => navigate(ROUTES.DASHBOARD),
    [navigate]
  );

  const goLogin = useCallback(
    (from?: string) =>
      navigate(ROUTES.LOGIN, from ? { state: { from } } : undefined),
    [navigate]
  );

  const goUsers = useCallback(() => navigate(ROUTES.USERS), [navigate]);

  const goUserDetail = useCallback(
    (id: string) => navigate(ROUTES.USERS_DETAIL.replace(":id", id)),
    [navigate]
  );

  const goUserEdit = useCallback(
    (id: string) => navigate(ROUTES.USERS_EDIT.replace(":id", id)),
    [navigate]
  );

  const goUserCreate = useCallback(
    () => navigate(ROUTES.USERS_CREATE),
    [navigate]
  );

  const goContent = useCallback(() => navigate(ROUTES.CONTENT), [navigate]);

  const goContentDetail = useCallback(
    (id: string) => navigate(ROUTES.CONTENT_DETAIL.replace(":id", id)),
    [navigate]
  );

  const goContentEdit = useCallback(
    (id: string) => navigate(ROUTES.CONTENT_EDIT.replace(":id", id)),
    [navigate]
  );

  const goContentCreate = useCallback(
    () => navigate(ROUTES.CONTENT_CREATE),
    [navigate]
  );

  const goAnalytics = useCallback(
    () => navigate(ROUTES.ANALYTICS),
    [navigate]
  );

  const goSettings = useCallback(() => navigate(ROUTES.SETTINGS), [navigate]);

  const goSettingsProfile = useCallback(
    () => navigate(ROUTES.SETTINGS_PROFILE),
    [navigate]
  );

  // ── Search-param helpers ───────────────────────────────────────────────────

  const getQueryParam = useCallback(
    (key: string) => searchParams.get(key),
    [searchParams]
  );

  const setQueryParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      next.set(key, value);
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const removeQueryParam = useCallback(
    (key: string) => {
      const next = new URLSearchParams(searchParams);
      next.delete(key);
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  return {
    // Raw primitives
    navigate,
    location,
    params,
    searchParams,

    // Generic
    goBack,
    goForward,

    // Named routes
    goDashboard,
    goLogin,
    goUsers,
    goUserDetail,
    goUserEdit,
    goUserCreate,
    goContent,
    goContentDetail,
    goContentEdit,
    goContentCreate,
    goAnalytics,
    goSettings,
    goSettingsProfile,

    // Query params
    getQueryParam,
    setQueryParam,
    removeQueryParam,
  };
}
