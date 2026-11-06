import { useEffect } from "react";
import { AppState } from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";
import { useCanteenStore } from "../store/canteenStore";

const MAX_ATTEMPTS = 3;
const POLL_MS = 60_000;

/**
 * Keeps the canteen's open/closed status in sync for the signed-in user:
 * loads at login (retrying if it fails), re-checks every minute because the
 * status changes by the clock (opening and closing time) with no database
 * event to listen for, re-checks when the app returns to the foreground, and
 * reacts live when staff close or reopen it. Clears on logout.
 */
export function useCanteenSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const load = useCanteenStore((s) => s.load);
  const reset = useCanteenStore((s) => s.reset);

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

    const interval = setInterval(() => load(), POLL_MS);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });

    const channel = supabase
      .channel(`canteen:settings:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "canteen_settings" }, () => {
        load();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      clearInterval(interval);
      appStateSub.remove();
      supabase.removeChannel(channel);
      reset();
    };
  }, [userId, load, reset]);
}