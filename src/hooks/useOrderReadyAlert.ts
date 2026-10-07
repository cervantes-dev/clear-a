import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";
import { haptics } from "../utils/haptics";

export type ReadyAlert = {
  orderId: string;
  /** e.g. "#012", undefined when the order has no number yet. */
  orderLabel?: string;
  /** Changes for every alert, so the banner's auto-dismiss timer restarts. */
  token: number;
};

/**
 * Listens for the student's own orders flipping to "ready" while the app is
 * open: fires a success haptic and exposes the alert so the layout can show a
 * banner. (An UPDATE event with status "ready" is exactly the transition --
 * the only later updates are completed/cancelled.) Alerts for a ready order
 * that happened while the app was closed need push notifications.
 */
export function useOrderReadyAlert() {
  const userId = useAuthStore((s) => s.user?.id);
  const [ready, setReady] = useState<ReadyAlert | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) {
      setReady(null);
      seen.current.clear();
      return;
    }

    const channel = supabase
      .channel(`orders:ready-alert:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `student_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.status !== "ready") return;

          const key = `${row.id}:${row.ready_at}`;
          if (seen.current.has(key)) return;
          seen.current.add(key);

          haptics.success();
          setReady({
            orderId: row.id,
            orderLabel: row.order_number ? `#${String(row.order_number).padStart(3, "0")}` : undefined,
            token: Date.now(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const dismiss = useCallback(() => setReady(null), []);

  return { ready, dismiss };
}