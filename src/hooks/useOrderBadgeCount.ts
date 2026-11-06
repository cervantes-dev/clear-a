import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

const ACTIVE_STATUSES = ["pending", "preparing", "ready"];

/**
 * Counts orders in the given statuses without downloading them: a head-only
 * request that returns just the number. Refetches (debounced) on any orders
 * change and when the app returns to the foreground. RLS scopes what each
 * role can count (students see only their own orders, staff see all).
 */
function useOrderCount(statuses: string[], realtimeFilter?: string): number {
  const userId = useAuthStore((s) => s.user?.id);
  const [count, setCount] = useState(0);
  const seq = useRef(0);
  const statusKey = statuses.join(",");

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    const { count: total, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", statusKey.split(","));

    // A newer request (or a logout) superseded this one.
    if (mySeq !== seq.current) return;
    if (error) {
      // Keep the last known count: a failed badge refresh isn't worth flashing "0".
      console.error("Failed to load order badge count:", error);
      return;
    }
    setCount(total ?? 0);
  }, [statusKey]);

  useEffect(() => {
    if (!userId) {
      seq.current++;
      setCount(0);
      return;
    }

    load();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`orders:badge:${statusKey}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          ...(realtimeFilter ? { filter: realtimeFilter } : {}),
        },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(load, 300);
        }
      )
      .subscribe();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load();
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, load, realtimeFilter, statusKey]);

  return count;
}

/** Student: their own orders that are pending, preparing or ready. */
export function useStudentActiveOrderCount(): number {
  const userId = useAuthStore((s) => s.user?.id);
  return useOrderCount(ACTIVE_STATUSES, userId ? `student_id=eq.${userId}` : undefined);
}

/** Staff: orders waiting to be started. */
export function useStaffPendingOrderCount(): number {
  return useOrderCount(["pending"]);
}