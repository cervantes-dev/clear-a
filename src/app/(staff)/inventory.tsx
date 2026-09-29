import InventoryFilterSheet, { INVENTORY_FILTER_OPTIONS, InventoryFilterKey } from "@/components/staff/inventory/InventoryFilterSheet";
import InventoryItemRow, { LOW_STOCK_THRESHOLD } from "@/components/staff/inventory/InventoryItemRow";
import InventoryListSkeleton from "@/components/staff/inventory/InventoryListSkeleton";
import SetStockModal from "@/components/staff/menu/SetStockModal";
import OrderStatPill from "@/components/staff/orders/OrderStatPill";
import StaffHeaderAvatar from "@/components/staff/StaffHeaderAvatar";
import { getMenuItems } from "@/services/menu";
import { clearTodaysStock, getTodaysStock, setTodaysStock } from "@/services/order";
import { MenuItem } from "@/types/menu";
import { DailyStock } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const today = () => new Date().toISOString().split("T")[0];
const TAB_BAR_CLEARANCE = 64 + 40 + 24;

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-text opacity-50 text-xs font-bold uppercase tracking-wide mb-2 mt-1">
      {children}
    </Text>
  );
}

export default function Inventory() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, DailyStock>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryFilterKey>("all");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const [stockTarget, setStockTarget] = useState<MenuItem | null>(null);
  const [stockSaving, setStockSaving] = useState(false);

  const loadData = async () => {
    try {
      const [menuItems, stock] = await Promise.all([getMenuItems(), getTodaysStock()]);
      setItems(menuItems);
      setStockMap(stock);
    } catch (e: any) {
      Alert.alert("Error loading inventory", e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const applyStockUpdate = (id: string, quantity: number) => {
    setStockMap((prev) => ({
      ...prev,
      [id]: {
        menuItemId: id,
        stockDate: today(),
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

  const handleIncrement = async (id: string) => {
    const prevEntry = stockMap[id];
    const nextQty = (prevEntry?.remainingQuantity ?? 0) + 1;
    applyStockUpdate(id, nextQty);
    try {
      await setTodaysStock(id, nextQty);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't update stock.");
    }
  };

  const handleDecrement = async (id: string) => {
    const prevEntry = stockMap[id];
    const current = prevEntry?.remainingQuantity ?? 0;
    if (current <= 0) return;
    const nextQty = current - 1;
    applyStockUpdate(id, nextQty);
    try {
      await setTodaysStock(id, nextQty);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't update stock.");
    }
  };

  const openStockModal = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setStockTarget(item);
  };

  const handleSetStock = async (quantity: number) => {
    if (!stockTarget) return;
    const id = stockTarget.id;
    const prevEntry = stockMap[id];
    setStockSaving(true);
    applyStockUpdate(id, quantity);
    try {
      await setTodaysStock(id, quantity);
      setStockTarget(null);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't update stock.");
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
    try {
      await clearTodaysStock(id);
      setStockTarget(null);
    } catch (e: any) {
      revertStock(id, prevEntry);
      Alert.alert("Error", e.message ?? "Couldn't clear stock cap.");
    } finally {
      setStockSaving(false);
    }
  };

  const alertCounts = useMemo(() => {
    let soldOut = 0;
    let low = 0;
    items.forEach((item) => {
      const remaining = stockMap[item.id]?.remainingQuantity ?? null;
      if (remaining === 0) soldOut++;
      else if (remaining !== null && remaining <= LOW_STOCK_THRESHOLD) low++;
    });
    return { soldOut, low };
  }, [items, stockMap]);

  const sortedItems = useMemo(() => {
    const withMeta = items
      .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
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

  const needsAttention = sortedItems.filter((x) => x.priority <= 1);
  const restItems = sortedItems.filter((x) => x.priority > 1);

  const filterCounts: Record<InventoryFilterKey, number> = {
    all: sortedItems.length,
    attention: needsAttention.length,
    soldOut: sortedItems.filter((x) => x.priority === 0).length,
    low: sortedItems.filter((x) => x.priority === 1).length,
    unlimited: sortedItems.filter((x) => x.priority === 3).length,
  };

  const filteredItems = useMemo(() => {
    switch (statusFilter) {
      case "attention":
        return sortedItems.filter((x) => x.priority <= 1);
      case "soldOut":
        return sortedItems.filter((x) => x.priority === 0);
      case "low":
        return sortedItems.filter((x) => x.priority === 1);
      case "unlimited":
        return sortedItems.filter((x) => x.priority === 3);
      default:
        return sortedItems;
    }
  }, [sortedItems, statusFilter]);

  const activeFilterLabel = INVENTORY_FILTER_OPTIONS.find((o) => o.key === statusFilter)?.label ?? "";

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-lg font-bold">Inventory</Text>
            <Text className="text-white/80 text-xs mt-0.5">Manage today's stock levels</Text>
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
        >
          <View className="px-5">
            <View className="flex-row mb-4">
              <OrderStatPill
                icon="cube-outline"
                count={items.length}
                label="Total Items"
                iconBg="#F5E9EC"
                iconColor="#800020"
                labelColor="#800020"
              />
              <OrderStatPill
                icon="close-circle-outline"
                count={alertCounts.soldOut}
                label="Sold Out"
                iconBg="#FDECEA"
                iconColor="#D32F2F"
                labelColor="#D32F2F"
              />
              <OrderStatPill
                icon="alert-circle-outline"
                count={alertCounts.low}
                label="Low Stock"
                iconBg="#FFF5E6"
                iconColor="#D97706"
                labelColor="#D97706"
              />
            </View>

            <View className="flex-row items-center mb-3">
              <View className="flex-1 flex-row items-center bg-card border border-border rounded-full px-4 py-2.5 mr-2">
                <Ionicons name="search-outline" size={18} color="#999" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search inventory..."
                  placeholderTextColor="#999"
                  className="flex-1 ml-2 text-text text-sm"
                />
              </View>

              <Pressable
                onPress={() => setFilterSheetVisible(true)}
                className={`w-11 h-11 rounded-full items-center justify-center border ${
                  statusFilter !== "all" ? "bg-primary border-primary" : "bg-card border-border"
                }`}
              >
                <Ionicons name="funnel-outline" size={18} color={statusFilter !== "all" ? "#fff" : "#666"} />
              </Pressable>
            </View>

            {statusFilter !== "all" && (
              <Pressable
                onPress={() => setStatusFilter("all")}
                className="flex-row items-center self-start bg-primary/10 rounded-full pl-3 pr-2 py-1.5 mb-4"
              >
                <Text className="text-primary text-xs font-semibold mr-1.5">{activeFilterLabel}</Text>
                <Ionicons name="close-circle" size={16} color="#800020" />
              </Pressable>
            )}

            {filteredItems.length === 0 ? (
              <Text className="text-text opacity-50 text-sm text-center mt-8">
                {search ? "No items match your search." : "No items in this filter."}
              </Text>
            ) : statusFilter === "all" ? (
              <>
                {needsAttention.length > 0 && (
                  <>
                    <SectionLabel>Needs Attention</SectionLabel>
                    {needsAttention.map(({ item, remaining }) => (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        remaining={remaining}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onOpenStockModal={openStockModal}
                      />
                    ))}
                  </>
                )}

                {restItems.length > 0 && (
                  <>
                    {needsAttention.length > 0 && <SectionLabel>All Items</SectionLabel>}
                    {restItems.map(({ item, remaining }) => (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        remaining={remaining}
                        onIncrement={handleIncrement}
                        onDecrement={handleDecrement}
                        onOpenStockModal={openStockModal}
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              filteredItems.map(({ item, remaining }) => (
                <InventoryItemRow
                  key={item.id}
                  item={item}
                  remaining={remaining}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onOpenStockModal={openStockModal}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <InventoryFilterSheet
        visible={filterSheetVisible}
        selected={statusFilter}
        counts={filterCounts}
        onSelect={setStatusFilter}
        onClose={() => setFilterSheetVisible(false)}
      />

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