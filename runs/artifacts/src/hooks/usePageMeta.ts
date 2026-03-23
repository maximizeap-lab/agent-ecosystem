import { useEffect } from "react";
import { useUIStore } from "@store/uiStore";
import { APP_NAME } from "@constants/index";
import type { BreadcrumbItem } from "@types/index";

interface PageMetaOptions {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  /** When true, the app name is NOT appended to the tab title. */
  exactTitle?: boolean;
}

/**
 * usePageMeta — Sets the browser tab title, the in-app page title, and the
 * breadcrumb trail for a given page.
 *
 * Usage:
 *   usePageMeta({ title: "Users", breadcrumbs: [{ label: "Home", path: "/" }] });
 */
export function usePageMeta({
  title,
  breadcrumbs = [],
  exactTitle = false,
}: PageMetaOptions) {
  const { setPageTitle, setBreadcrumbs } = useUIStore();

  useEffect(() => {
    // Update browser tab
    document.title = exactTitle ? title : `${title} | ${APP_NAME}`;

    // Update in-app state
    setPageTitle(title);
    setBreadcrumbs(breadcrumbs);

    // Clean up on unmount
    return () => {
      document.title = APP_NAME;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
}
