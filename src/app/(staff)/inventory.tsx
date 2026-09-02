import InventoryItemRow, { LOW_STOCK_THRESHOLD } from "@/components/staff/inventory/InventoryItemRow";
import SetStockModal from "@/components/staff/menu/SetStockModal";
import StaffHeaderAvatar from "@/components/staff/StaffHeaderAvatar";
import { getMenuItems } from "@/services/menu";
import { clearTodaysStock, getTodaysStock, setTodaysStock } from "@/services/order";
import { MenuItem } from "@/types/menu";
import { DailyStock } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const today = () => new Date().toISOString().split("T")[0];

export default function Inventory() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, DailyStock>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const summaryText =
    alertCounts.soldOut + alertCounts.low === 0
      ? "All items well stocked"
      : [
        alertCounts.soldOut > 0 ? `${alertCounts.soldOut} sold out` : null,
        alertCounts.low > 0 ? `${alertCounts.low} low stock` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-lg font-bold">Inventory</Text>
            <Text className="text-white/80 text-xs mt-0.5">{summaryText}</Text>
          </View>
          <StaffHeaderAvatar />
        </View>
      </View>
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
          <ActivityIndicator size="large" color="#800020" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background rounded-t-3xl"
          style={{ marginTop: -20 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
        >
          <View className="px-5">
            <View className="flex-row items-center bg-card border border-border rounded-full px-4 py-2.5 mb-4">
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search inventory..."
                placeholderTextColor="#999"
                className="flex-1 ml-2 text-text text-sm"
              />
            </View>

            {sortedItems.length === 0 ? (
              <Text className="text-text opacity-50 text-sm text-center mt-8">No items match your search.</Text>
            ) : (
              sortedItems.map(({ item, remaining }) => (
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