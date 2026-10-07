import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getCategories, getMenuItems } from "../services/menu";
import { getTodaysStock } from "../services/order";
import { supabase } from "../services/supabase";
import { Category, MenuItem } from "../types/menu";
import { DailyStock } from "../types/order";
import { todayManila } from "../utils/date";

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

  // Overlapping loads share one request instead of racing each other.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // `silent` = background refetch (foreground return, live menu changes):
  // never shows an error banner over a menu the student is already looking at.
  const loadData = useCallback((silent = false): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;

    const run = (async () => {
      try {
        if (!silent) setError(null);
        const [items, cats, stock] = await Promise.all([
          getMenuItems(),
          getCategories(),
          getTodaysStock(),
        ]);
        setMenuItems(items);
        setCategories(cats);
        setStockMap(stock);
        setError(null);
      } catch (err) {
        console.error("Failed to load menu:", err);
        if (!silent) setError("Couldn't load the menu. Pull down to try again.");
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
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Realtime doesn't survive the app being suspended, so stock or menu
  // changes made while the phone was locked would be missed. Refetch quietly
  // when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadData(true);
    });
    return () => sub.remove();
  }, [loadData]);

  // Live menu changes: when staff toggle availability / special, or edit,
  // add or delete an item, refetch quietly. A full refetch (rather than
  // patching the changed row) keeps joined data -- category names, variants --
  // correct. Debounced so a burst of changes (e.g. the nightly perishable
  // reset touching many items, or an item edit that also rewrites its
  // variants) becomes a single refetch.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channelName = `menu:student:${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => loadData(true), 800);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
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

          // Only care about today's row (Manila date, matching Postgres
          // current_date) -- a stale prior-day row shouldn't overwrite what's
          // currently displayed.
          if (row.stock_date !== todayManila()) return;

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