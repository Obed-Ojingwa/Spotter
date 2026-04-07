import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: { role: string; email?: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (tokens: { access_token: string; refresh_token: string; role: string }) => void;
  clearAuth: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ access_token, refresh_token, role }) => {
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        set({ accessToken: access_token, refreshToken: refresh_token, user: { role } });
      },

      clearAuth: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isLoggedIn: () => !!get().accessToken,
    }),
    {
      name: "spotter-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);