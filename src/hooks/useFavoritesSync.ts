import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useFavoritesStore } from "../store/favoritesStore";

const MAX_ATTEMPTS = 3;

/**
 * Keeps the favorites store in sync with the server for the signed-in user:
 * loads on login (retrying a few times if the request fails), re-syncs when
 * the app returns to the foreground (picks up changes made on another
 * device), and clears everything on logout or account switch so one
 * account's favorites never show up for the next.
 */
export function useFavoritesSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const loadFavorites = useFavoritesStore((s) => s.loadFavorites);
  const reset = useFavoritesStore((s) => s.reset);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (n: number) => {
      const ok = await loadFavorites();
      if (cancelled || ok || n >= MAX_ATTEMPTS) return;
      retryTimer = setTimeout(() => attempt(n + 1), 2000 * n);
    };

    attempt(1);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadFavorites();
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      sub.remove();
      reset();
    };
  }, [userId, loadFavorites, reset]);
}