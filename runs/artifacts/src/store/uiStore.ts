import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { ThemeMode } from "@types/index";
import { STORAGE_KEYS } from "@constants/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIState {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  activeModal: string | null;
  breadcrumbs: BreadcrumbEntry[];
  pageTitle: string;
}

interface BreadcrumbEntry {
  label: string;
  path?: string;
}

interface UIActions {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarMobileOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbEntry[]) => void;
  setPageTitle: (title: string) => void;
}

type UIStore = UIState & UIActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        theme: "system",
        sidebarCollapsed: false,
        sidebarMobileOpen: false,
        activeModal: null,
        breadcrumbs: [],
        pageTitle: "",

        // Actions
        setTheme: (theme) => set({ theme }, false, "ui/setTheme"),

        toggleTheme: () => {
          const current = get().theme;
          const next: ThemeMode =
            current === "light" ? "dark" : current === "dark" ? "system" : "light";
          set({ theme: next }, false, "ui/toggleTheme");
        },

        toggleSidebar: () =>
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            "ui/toggleSidebar"
          ),

        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }, false, "ui/setSidebarCollapsed"),

        setSidebarMobileOpen: (open) =>
          set({ sidebarMobileOpen: open }, false, "ui/setSidebarMobileOpen"),

        openModal: (modalId) =>
          set({ activeModal: modalId }, false, "ui/openModal"),

        closeModal: () =>
          set({ activeModal: null }, false, "ui/closeModal"),

        setBreadcrumbs: (breadcrumbs) =>
          set({ breadcrumbs }, false, "ui/setBreadcrumbs"),

        setPageTitle: (pageTitle) =>
          set({ pageTitle }, false, "ui/setPageTitle"),
      }),
      {
        name: STORAGE_KEYS.THEME,
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: "UIStore" }
  )
);
