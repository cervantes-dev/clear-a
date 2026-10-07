import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getAllOrders, getOrderById } from "../services/order";
import { supabase } from "../services/supabase";
import { Order } from "../types/order";

export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overlapping loads (foreground refetch + pull-to-refresh, or the dev
  // double-mount) share one request instead of racing each other.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // `silent` = background refetch: never shows an error banner over data the
  // staff member is already looking at.
  const load = useCallback((silent = false): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      try {
        if (!silent) setError(null);
        const data = await getAllOrders();
        setOrders(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load orders:", err);
        if (!silent) setError("Couldn't load orders. Pull down to try again.");
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

  // Realtime connections don't survive the phone being locked, so orders that
  // arrived meanwhile would be missed. Refetch quietly on return to the app.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") load(true);
    });
    return () => sub.remove();
  }, [load]);

  // Staff sees every order, no student_id filter -- RLS already scopes the
  // underlying select to staff-only via the "staff can view all orders" policy.
  useEffect(() => {
    const channelName = `orders:staff:all:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
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
  }, []);

  return { orders, loading, refreshing, error, refresh };
}