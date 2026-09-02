import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OrderCard from "../../components/student/orders/OrderCard";
import { useMyOrders } from "../../hooks/useMyOrders";

const ACTIVE_STATUSES = ["pending", "preparing", "ready"];

export default function StudentOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { justPlaced } = useLocalSearchParams<{ justPlaced?: string }>();
  const { orders, loading, refreshing, error, refresh } = useMyOrders();

  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const history = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as staff screens */}
      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-white text-2xl font-bold">My Orders</Text>
        <Text className="text-white/80 text-sm mt-1">Track your pickups</Text>
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
        ) : (
          <ScrollView
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          >
            {active.length > 0 && (
              <View className="mb-2">
                <Text className="text-lg font-bold text-text mb-3">Active</Text>
                {active.map((order) => (
                  <OrderCard key={order.id} order={order} highlighted={order.id === justPlaced} />
                ))}
              </View>
            )}

            {history.length > 0 && (
              <View className="mt-2">
                <Text className="text-lg font-bold text-text mb-3">History</Text>
                {history.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}