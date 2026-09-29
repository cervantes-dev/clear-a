import { create } from "zustand";
import { AppUser } from "../types/auth";

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  // When true, RootLayout's auth-based redirect effect skips acting on user
  // changes. Set this before a screen plays its own success transition (so
  // the global redirect doesn't cut it off), then clear it right when that
  // screen navigates itself.
  suppressRedirect: boolean;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setSuppressRedirect: (suppress: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  suppressRedirect: false,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setSuppressRedirect: (suppressRedirect) => set({ suppressRedirect }),
  logout: () => set({ user: null }),
}));