import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type { User, AuthState } from "@types/index";
import { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from "@constants/index";

interface AuthActions {
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // start as true — resolves once persisted state is rehydrated
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setUser: (user) => set({ user }, false, "auth/setUser"),

        setTokens: (token, refreshToken) =>
          set({ token, refreshToken }, false, "auth/setTokens"),

        setLoading: (isLoading) =>
          set({ isLoading }, false, "auth/setLoading"),

        login: (user, token, refreshToken) =>
          set(
            { user, token, refreshToken, isAuthenticated: true, isLoading: false },
            false,
            "auth/login"
          ),

        logout: () =>
          set(
            { ...initialState, isLoading: false },
            false,
            "auth/logout"
          ),

        updateUser: (partial) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...partial } : null,
            }),
            false,
            "auth/updateUser"
          ),
      }),
      {
        name: "auth-store",
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          // Once zustand has rehydrated from localStorage, mark loading as done
          if (state) {
            state.isLoading = false;
          }
        },
      }
    ),
    { name: "AuthStore" }
  )
);

// ─── Storage helpers (kept in sync for non-Zustand code) ─────────────────────

export const authStorage = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (token: string, refreshToken: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
