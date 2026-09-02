import { useCallback, useEffect, useState } from "react";
import { getAllOrders, getOrderById } from "../services/order";
import { supabase } from "../services/supabase";
import { Order } from "../types/order";

export function useAllOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Couldn't load orders. Pull down to try again.");
    }
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
            const fullOrder = await getOrderById((payload.new as any).id);
            setOrders((prev) => [fullOrder, ...prev]);
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