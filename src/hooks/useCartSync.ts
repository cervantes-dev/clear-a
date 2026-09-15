import { useEffect } from "react";
import { getCartItemById } from "../services/cart";
import { supabase } from "../services/supabase";
import { useCartStore } from "../store/cartStore";

/**
 * Loads the signed-in user's cart and subscribes to realtime changes on
 * cart_items so an add/update/remove on one device (same account) pushes
 * live to any other device -- mirrors the pattern in useStudentMenu's
 * stock subscription and useMyOrders' order subscription.
 */
export function useCartSync(userId: string | undefined | null) {
  useEffect(() => {
    if (!userId) {
      useCartStore.getState().reset();
      return;
    }

    useCartStore.getState().loadCart();

    const channelName = `cart:${userId}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            useCartStore.getState()._applyRemoteDelete(oldRow.id);
            return;
          }

          const newRow = payload.new as any;
          try {
            const full = await getCartItemById(newRow.id);
            useCartStore.getState()._applyRemoteUpsert(full);
          } catch (err) {
            console.error("Failed to sync cart change:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}