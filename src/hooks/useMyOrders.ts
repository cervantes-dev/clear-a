import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getMyOrders, getOrderById } from "../services/order";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";
import { Order } from "../types/order";

export function useMyOrders() {
  const userId = useAuthStore((s) => s.user?.id);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overlapping loads (foreground refetch + pull-to-refresh, or the dev
  // double-mount) share one request instead of racing each other.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // `silent` = background refetch: never shows an error banner over data the
  // student is already looking at, since a failed background refresh isn't
  // worth interrupting them for.
  const load = useCallback((silent = false): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      try {
        if (!silent) setError(null);
        const data = await getMyOrders();
        setOrders(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load orders:", err);
        if (!silent) setError("Couldn't load your orders. Pull down to try again.");
      }
    })().finally(() => {
      inFlightRef.current = null;
    });

    inFlightRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Realtime connections don't survive the app being suspended, so any status
  // change that happened while the phone was locked would be missed. Refetch
  // quietly whenever the app comes back to the foreground.
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load(true);
    });
    return () => sub.remove();
  }, [userId, load]);

  // Realtime: any INSERT/UPDATE on this student's own orders patches local
  // state directly, no refetch needed for status-only changes.
  useEffect(() => {
    if (!userId) return;
    const channelName = `orders:student:${userId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `student_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            try {
              const fullOrder = await getOrderById((payload.new as any).id);
              // The order may already be in the list (a load and the realtime
              // event can both deliver it) -- never add it twice.
              setOrders((prev) => (prev.some((o) => o.id === fullOrder.id) ? prev : [fullOrder, ...prev]));
            } catch (err) {
              console.error("Failed to fetch inserted order:", err);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? {
                      ...o,
                      status: updated.status,
                      readyAt: updated.ready_at,
                      pickupDeadline: updated.pickup_deadline,
                      completedAt: updated.completed_at,
                      cancelledAt: updated.cancelled_at,
                      total: Number(updated.total),
                    }
                  : o
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { orders, loading, refreshing, error, refresh };
}