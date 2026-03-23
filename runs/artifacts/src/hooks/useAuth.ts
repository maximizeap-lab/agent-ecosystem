import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { authService } from "@services/authService";
import { useAuthStore, authStorage } from "@store/authStore";
import { QUERY_KEYS, ROUTES } from "@constants/index";
import type { LoginCredentials, RegisterPayload } from "@types/index";

/**
 * useAuth — Provides authentication-related mutations and the current auth state.
 *
 * Usage:
 *   const { login, logout, register, user, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { login: storeLogin, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  // ── Fetch / refresh current user ───────────────────────────────────────────
  const meQuery = useQuery({
    queryKey: QUERY_KEYS.AUTH.ME,
    queryFn: () => authService.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false,
  });

  // ── Login ──────────────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      authService.login(credentials),
    onSuccess: (response) => {
      const { user, token, refreshToken } = response.data;
      authStorage.setTokens(token, refreshToken);
      storeLogin(user, token, refreshToken);
      queryClient.setQueryData(QUERY_KEYS.AUTH.ME, { data: user });

      toast.success(`Welcome back, ${user.firstName}!`);

      // Navigate to the originally-requested page or fallback to dashboard
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ??
        ROUTES.DASHBOARD;
      navigate(from, { replace: true });
    },
    onError: (error: { message: string }) => {
      toast.error(error.message ?? "Login failed. Please try again.");
    },
  });

  // ── Register ───────────────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authService.register(payload),
    onSuccess: (response) => {
      const { user, token, refreshToken } = response.data;
      authStorage.setTokens(token, refreshToken);
      storeLogin(user, token, refreshToken);
      toast.success("Account created successfully!");
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error: { message: string }) => {
      toast.error(error.message ?? "Registration failed. Please try again.");
    },
  });

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Always clear local state, even if the server call fails
      authStorage.clearTokens();
      storeLogout();
      queryClient.clear();
      navigate(ROUTES.LOGIN, { replace: true });
      toast.success("You have been logged out.");
    },
  });

  // ── Forgot Password ────────────────────────────────────────────────────────
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      toast.success("Password reset email sent. Please check your inbox.");
    },
    onError: (error: { message: string }) => {
      toast.error(error.message ?? "Failed to send reset email.");
    },
  });

  // ── Reset Password ─────────────────────────────────────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success("Password reset successfully. Please log in.");
      navigate(ROUTES.LOGIN, { replace: true });
    },
    onError: (error: { message: string }) => {
      toast.error(error.message ?? "Failed to reset password.");
    },
  });

  return {
    // State
    user: meQuery.data?.data ?? user,
    isAuthenticated,
    isLoadingUser: meQuery.isLoading,

    // Mutations
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,

    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,

    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,

    forgotPassword: forgotPasswordMutation.mutate,
    isSendingReset: forgotPasswordMutation.isPending,

    resetPassword: resetPasswordMutation.mutate,
    isResettingPassword: resetPasswordMutation.isPending,
  };
}
