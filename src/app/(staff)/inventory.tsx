import InventoryItemRow, { LOW_STOCK_THRESHOLD } from "@/components/staff/inventory/InventoryItemRow";
import InventoryListSkeleton from "@/components/staff/inventory/InventoryListSkeleton";
import SetStockModal from "@/components/staff/menu/SetStockModal";
import StaffHeaderAvatar from "@/components/staff/StaffHeaderAvatar";
import { getMenuItems } from "@/services/menu";
import { clearTodaysStock, getTodaysStock, setTodaysStock } from "@/services/order";
import { supabase } from "@/services/supabase";
import { MenuItem } from "@/types/menu";
import { DailyStock } from "@/types/order";
import { todayManila } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterKey = "all" | "soldOut" | "low" | "unlimited";

const TAB_BAR_CLEARANCE = 64 + 40 + 24;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-text opacity-50 text-xs font-bold uppercase tracking-wide mb-2 mt-1">
      {children}
    </Text>
  );
}

function FilterChip({
  label,
  count,
  dotColor,
  active,
  onPress,
}: {
  label: string;
  count: number;
  dotColor?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-3.5 py-2 rounded-full border mr-2 ${
        active ? "bg-primary border-primary" : "bg-card border-border"
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} items`}
    >
      {dotColor && (
        <View
          className="w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: active ? "#fff" : dotColor }}
        />
      )}
      <Text className={`text-xs font-bold ${active ? "text-white" : "text-text"}`}>{label}</Text>
      <Text className={`text-xs font-bold ml-1.5 ${active ? "text-white/80" : "text-text opacity-40"}`}>
        {count}
      </Text>
    </Pressable>
  );
}

export default function Inventory() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, DailyStock>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const [stockTarget, setStockTarget] = useState<MenuItem | null>(null);
  const [stockSaving, setStockSaving] = useState(false);

  // Items whose stock write is still in flight. While a write is pending we
  // ignore live updates (and background reloads) for that item, so the
  // optimistic number the staff member just set doesn't flicker back to an
  // older value.
  const writing = useRef(new Map<string, number>());
  const beginWrite = (id: string) => writing.current.set(id, (writing.current.get(id) ?? 0) + 1);
  const endWrite = (id: string) => {
    const left = (writing.current.get(id) ?? 1) - 1;
    if (left <= 0) writing.current.delete(id);
    else writing.current.set(id, left);
  };

  // `silent` = background refresh (foreground return, live menu change): no
  // error popup over a screen that is already showing data.
  const loadData = useCallback(async (silent = false) => {
    try {
      const [menuItems, stock] = await Promise.all([getMenuItems(), getTodaysStock()]);
      setItems(menuItems);
      setStockMap((prev) => {
        const next = { ...stock };
        writing.current.forEach((_, id) => {
          if (prev[id]) next[id] = prev[id];
          else delete next[id];
        });
        return next;
      });
    } catch (e: any) {
      if (silent) console.error("Failed to refresh inventory:", e);
      else Alert.alert("Error loading inventory", e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Realtime doesn't survive the phone being locked: catch up on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadData(true);
    });
    return () => sub.remove();
  }, [loadData]);

  // Live updates: stock counts tick down as students order, and menu changes
  // (availability, edits) show up without a manual refresh.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadData(true), 800);
    };

    const channel = supabase
      .channel(`inventory:live:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_item_daily_stock" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            // Without `replica identity full` a delete only carries the row id,
            // not which item it was -- fall back to a quiet reload.
            if (!oldRow?.menu_item_id) {
              scheduleReload();
              return;
            }
            if (writing.current.has(oldRow.menu_item_id)) return;
            setStockMap((prev) => {
              const next = { ...prev };
              delete next[oldRow.menu_item_id];
              return next;
            });
            return;
          }

          const row = payload.new as any;
          // Only today's row (Manila date, matching Postgres current_date).
          if (row.stock_date !== todayManila()) return;
          if (writing.current.has(row.menu_item_id)) return;

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
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, scheduleReload)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const applyStockUpdate = (id: string, quantity: number) => {
    setStockMap((prev) => ({
      ...prev,
      [id]: {
        menuItemId: id,
        stockDate: todayManila(),
        initialQuantity: quantity,
        remainingQuantity: quantity,
      },
    }));
  };

  const revertStock = (id: string, prevEntry: DailyStock | undefined) => {
    setStockMap((prev) => {
      const next = { ...prev };
      if (prevEntry) next[id] = prevEntry;
      else delete next[id];
      return next;
    });
  };

  const writeStock = async (id: string, quantity: number, prevEntry: DailyStock | undefined) => {
    applyStockUpdate(id, quantity);
    beginWrite(id);
    try {
      await setTodaysStock(id, quantity);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't update stock.");
      throw e;
    } finally {
      endWrite(id);
    }
  };

  const handleIncrement = async (id: string) => {
    const prevEntry = stockMap[id];
    try {
      await writeStock(id, (prevEntry?.remainingQuantity ?? 0) + 1, prevEntry);
    } catch {
      // already reverted and reported
    }
  };

  const handleDecrement = async (id: string) => {
    const prevEntry = stockMap[id];
    const current = prevEntry?.remainingQuantity ?? 0;
    if (current <= 0) return;
    try {
      await writeStock(id, current - 1, prevEntry);
    } catch {
      // already reverted and reported
    }
  };

  const openStockModal = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setStockTarget(item);
  };

  const handleSetStock = async (quantity: number) => {
    if (!stockTarget) return;
    const id = stockTarget.id;
    setStockSaving(true);
    try {
      await writeStock(id, quantity, stockMap[id]);
      setStockTarget(null);
    } catch {
      // already reverted and reported; keep the dialog open so they can retry
    } finally {
      setStockSaving(false);
    }
  };

  const handleClearStock = async () => {
    if (!stockTarget) return;
    const id = stockTarget.id;
    const prevEntry = stockMap[id];
    setStockSaving(true);
    setStockMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    beginWrite(id);
    try {
      await clearTodaysStock(id);
      setStockTarget(null);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't clear stock cap.");
    } finally {
      endWrite(id);
      setStockSaving(false);
    }
  };

  const sortedItems = useMemo(() => {
    const withMeta = items
      .filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
      .map((item) => {
        const remaining = stockMap[item.id]?.remainingQuantity ?? null;
        let priority: number;
        if (remaining === 0) priority = 0;
        else if (remaining !== null && remaining <= LOW_STOCK_THRESHOLD) priority = 1;
        else if (remaining !== null) priority = 2;
        else priority = 3;
        return { item, remaining, priority };
      });

    return withMeta.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.priority <= 1) return (a.remaining ?? 0) - (b.remaining ?? 0);
      return a.item.name.localeCompare(b.item.name);
    });
  }, [items, stockMap, search]);

  const counts = {
    all: sortedItems.length,
    soldOut: sortedItems.filter((x) => x.priority === 0).length,
    low: sortedItems.filter((x) => x.priority === 1).length,
    unlimited: sortedItems.filter((x) => x.priority === 3).length,
  };

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "soldOut":
        return sortedItems.filter((x) => x.priority === 0);
      case "low":
        return sortedItems.filter((x) => x.priority === 1);
      case "unlimited":
        return sortedItems.filter((x) => x.priority === 3);
      default:
        return sortedItems;
    }
  }, [sortedItems, filter]);

  const needsAttention = sortedItems.filter((x) => x.priority <= 1);
  const restItems = sortedItems.filter((x) => x.priority > 1);

  // Noon UTC on the Manila date can't slip to an adjacent day in any phone timezone.
  const dateLabel = new Date(`${todayManila()}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const renderRow = ({ item, remaining }: { item: MenuItem; remaining: number | null }) => (
    <InventoryItemRow
      key={item.id}
      item={item}
      remaining={remaining}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onOpenStockModal={openStockModal}
    />
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-lg font-bold">Inventory</Text>
            <Text className="text-white/80 text-xs mt-0.5">Today's stock · {dateLabel}</Text>
          </View>
          <StaffHeaderAvatar />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20, paddingTop: 20 }}>
          <InventoryListSkeleton />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background rounded-t-3xl"
          style={{ marginTop: -20 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5">
            <View className="flex-row items-center bg-card border border-border rounded-full px-4 py-2.5 mb-3">
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search items..."
                placeholderTextColor="#999"
                className="flex-1 ml-2 text-text text-sm"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color="#C9B8BD" />
                </Pressable>
              )}
            </View>

            {/* Summary and filter in one: tap a chip to see just those items */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              keyboardShouldPersistTaps="handled"
            >
              <FilterChip label="All" count={counts.all} active={filter === "all"} onPress={() => setFilter("all")} />
              <FilterChip
                label="Sold out"
                count={counts.soldOut}
                dotColor="#D32F2F"
                active={filter === "soldOut"}
                onPress={() => setFilter("soldOut")}
              />
              <FilterChip
                label="Low"
                count={counts.low}
                dotColor="#D97706"
                active={filter === "low"}
                onPress={() => setFilter("low")}
              />
              <FilterChip
                label="No limit"
                count={counts.unlimited}
                dotColor="#6B7280"
                active={filter === "unlimited"}
                onPress={() => setFilter("unlimited")}
              />
            </ScrollView>

            {filteredItems.length === 0 ? (
              <View className="items-center py-12">
                <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Ionicons name="cube-outline" size={24} color="#800020" />
                </View>
                <Text className="text-text font-semibold text-sm text-center">
                  {items.length === 0
                    ? "No menu items yet"
                    : search
                    ? "No items match your search"
                    : "Nothing here right now"}
                </Text>
                <Text className="text-text opacity-50 text-xs text-center mt-1">
                  {items.length === 0 ? "Add items in the Menu tab first." : "Try a different filter."}
                </Text>
              </View>
            ) : filter === "all" ? (
              <>
                {needsAttention.length > 0 && (
                  <>
                    <SectionLabel>{`Needs attention · ${needsAttention.length}`}</SectionLabel>
                    {needsAttention.map(renderRow)}
                  </>
                )}

                {restItems.length > 0 && (
                  <>
                    {needsAttention.length > 0 && <SectionLabel>{`Everything else · ${restItems.length}`}</SectionLabel>}
                    {restItems.map(renderRow)}
                  </>
                )}
              </>
            ) : (
              filteredItems.map(renderRow)
            )}
          </View>
        </ScrollView>
      )}

      <SetStockModal
        visible={!!stockTarget}
        itemName={stockTarget?.name ?? ""}
        currentStock={stockTarget ? stockMap[stockTarget.id]?.remainingQuantity ?? null : null}
        saving={stockSaving}
        onClose={() => setStockTarget(null)}
        onSetStock={handleSetStock}
        onClearStock={handleClearStock}
      />
    </View>
  );
}