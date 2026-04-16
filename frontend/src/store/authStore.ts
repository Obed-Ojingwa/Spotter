// C:\Users\Melody\Documents\Spotter\frontend\src\store\authStore.ts

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

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ access_token, refresh_token, role }) => {
        // Store tokens in localStorage for API calls
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        // Store role in cookie so Next.js middleware can read it
        setCookie("spotter_role", role);
        set({ accessToken: access_token, refreshToken: refresh_token, user: { role } });
      },

      clearAuth: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        deleteCookie("spotter_role");
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
