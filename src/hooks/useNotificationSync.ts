import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";

const MAX_ATTEMPTS = 3;

/**
 * Keeps dismissed notifications and the "last seen" time in sync with the
 * server for the signed-in user: loads on login (retrying if it fails),
 * re-syncs when the app returns to the foreground, and clears on logout or
 * account switch.
 */
export function useNotificationSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const load = useNotificationStore((s) => s.load);
  const reset = useNotificationStore((s) => s.reset);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const attempt = async (n: number) => {
      const ok = await load();
      if (cancelled || ok || n >= MAX_ATTEMPTS) return;
      retryTimer = setTimeout(() => attempt(n + 1), 2000 * n);
    };

    attempt(1);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      sub.remove();
      reset();
    };
  }, [userId, load, reset]);
}