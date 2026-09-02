import { useCallback, useEffect, useState } from "react";
import { getCategories, getMenuItems } from "../services/menu";
import { getTodaysStock } from "../services/order";
import { supabase } from "../services/supabase";
import { Category, MenuItem } from "../types/menu";
import { DailyStock } from "../types/order";

type UseStudentMenuResult = {
  menuItems: MenuItem[];
  categories: Category[];
  stockMap: Record<string, DailyStock>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useStudentMenu(): UseStudentMenuResult {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, DailyStock>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [items, cats, stock] = await Promise.all([
        getMenuItems(),
        getCategories(),
        getTodaysStock(),
      ]);
      setMenuItems(items);
      setCategories(cats);
      setStockMap(stock);
    } catch (err) {
      console.error("Failed to load menu:", err);
      setError("Couldn't load the menu. Pull down to try again.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Live stock: any INSERT/UPDATE/DELETE on today's stock rows patches
  // stockMap directly. Covers orders being placed (decrement), staff
  // manually setting/clearing stock, and the nightly carry-over/reset jobs --
  // all of these write to this same table, so one subscription covers every
  // source of change without needing a full menu refetch.
  useEffect(() => {
    const channelName = `stock:student:${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_item_daily_stock" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            setStockMap((prev) => {
              const next = { ...prev };
              delete next[oldRow.menu_item_id];
              return next;
            });
            return;
          }

          const row = payload.new as any;

          // Only care about today's row -- a stale prior-day row shouldn't
          // overwrite what's currently displayed.
          const today = new Date().toISOString().split("T")[0];
          if (row.stock_date !== today) return;

          setStockMap((prev) => ({
            ...prev,
            [row.menu_item_id]: {
              menuItemId: row.menu_item_id,
              stockDate: row.stock_date,
              initialQuantity: row.initial_quantity,
              remainingQuantity: row.remaining_quantity,
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { menuItems, categories, stockMap, loading, refreshing, error, refresh };
}