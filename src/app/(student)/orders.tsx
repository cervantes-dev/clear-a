import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PickupInfoModal from "../../components/student/home/PickupInfoModal";
import OrderCard from "../../components/student/orders/OrderCard";
import { useMyOrders } from "../../hooks/useMyOrders";
import { useCartStore } from "../../store/cartStore";

const ACTIVE_STATUSES = ["pending", "preparing", "ready"];

type FilterKey = "active" | "history";

export default function StudentOrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { justPlaced } = useLocalSearchParams<{ justPlaced?: string }>();
  const { orders, loading, refreshing, error, refresh } = useMyOrders();
  const [pickupInfoVisible, setPickupInfoVisible] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("active");

  const itemCount = useCartStore((s) => s.itemCount());

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const history = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  const displayedOrders = filter === "active" ? active : history;

  const FILTERS: { key: FilterKey; label: string; count: number }[] = useMemo(
    () => [
      { key: "active", label: "Active", count: active.length },
      { key: "history", label: "History", count: history.length },
    ],
    [active.length, history.length]
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as staff screens */}
      <View
        className="bg-primary px-5 pb-8 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View>
          <Text className="text-white text-2xl font-bold">My Orders</Text>
          <Text className="text-white/80 text-sm mt-1">Track your pickups</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center mr-2"
            onPress={() => setPickupInfoVisible(true)}
          >
            <Ionicons name="information-circle-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center"
            onPress={() => router.push("/(student)/cart")}
          >
            <Ionicons name="cart-outline" size={22} color="#fff" />
            {itemCount > 0 && (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger items-center justify-center">
                <Text className="text-white text-[10px] font-bold">{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
        {justPlaced && (
          <View className="flex-row items-center bg-statusReadyBg border border-green-200 mx-4 mt-5 px-4 py-3 rounded-xl">
            <Ionicons name="checkmark-circle" size={20} color="#2E9E44" />
            <Text className="text-sm text-statusReadyText ml-2 flex-1">
              Order placed! We'll update you here as it's prepared.
            </Text>
          </View>
        )}

        {!loading && !error && orders.length > 0 && (
          <View className="flex-row bg-gray-100 rounded-full mx-4 mt-4 p-1">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`flex-1 items-center py-2.5 rounded-full ${isActive ? "bg-primary" : ""}`}
                >
                  <Text className={`text-xs font-bold ${isActive ? "text-white" : "text-text opacity-50"}`}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-text opacity-50">Loading your orders...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-text opacity-60 text-center">{error}</Text>
          </View>
        ) : orders.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="bag-outline" size={28} color="#800020" />
            </View>
            <Text className="text-text font-bold text-base text-center mb-1">No orders yet</Text>
            <Text className="text-text opacity-50 text-sm text-center">
              Orders you place will show up here with live status updates.
            </Text>
          </View>
        ) : displayedOrders.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons
                name={filter === "active" ? "time-outline" : "receipt-outline"}
                size={28}
                color="#800020"
              />
            </View>
            <Text className="text-text font-bold text-base text-center mb-1">
              {filter === "active" ? "No active orders" : "No order history yet"}
            </Text>
            <Text className="text-text opacity-50 text-sm text-center">
              {filter === "active"
                ? "Orders you place will show up here with live status updates."
                : "Completed and cancelled orders will appear here."}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          >
            {displayedOrders.map((order) => (
              <OrderCard key={order.id} order={order} highlighted={order.id === justPlaced} />
            ))}
          </ScrollView>
        )}
      </View>

      <PickupInfoModal visible={pickupInfoVisible} onClose={() => setPickupInfoVisible(false)} />
    </View>
  );
}