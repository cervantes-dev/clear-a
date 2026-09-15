// components/student/home/ActiveOrderCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Order, OrderStatus } from "../../../types/order";
import OrderProgressTracker from "../orders/OrderProgressTracker";
import PickupCountdown from "../orders/PickupCountdown";

type Props = {
  order: Order;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#E69500", bg: "#FFF5E6" },
  preparing: { label: "Preparing", color: "#F26B1D", bg: "#FFF0E8" },
  ready: { label: "Ready for Pickup", color: "#2E9E44", bg: "#EAF8EC" },
  completed: { label: "Completed", color: "#2B2B2B", bg: "#ECECF2" },
  cancelled: { label: "Cancelled", color: "#D32F2F", bg: "#FDECEA" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ActiveOrderCard({ order }: Props) {
  const router = useRouter();
  const config = STATUS_CONFIG[order.status];

  return (
    <Pressable
      onPress={() => router.push("/(student)/orders")}
      className="mx-4 mt-6 bg-card rounded-2xl border border-border overflow-hidden"
    >
      <View className="flex-row items-center justify-between px-4 pt-4">
        <View className="flex-row items-center">
          <Ionicons name="receipt-outline" size={18} color="#800020" />
          <Text className="text-text font-bold text-base ml-2">Your Active Order</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-primary text-xs font-semibold mr-1">View all orders</Text>
          <Ionicons name="chevron-forward" size={14} color="#800020" />
        </View>
      </View>

      <View className="flex-row mx-4 mt-3 mb-4 bg-background rounded-xl overflow-hidden">
        <View className="bg-primary px-4 py-3 justify-center">
          <Text className="text-white/70 text-[10px]">Order Number</Text>
          <Text className="text-white text-lg font-bold">
            {order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : "—"}
          </Text>
          <Text className="text-white/70 text-[10px] mt-1">{formatTime(order.createdAt)}</Text>
        </View>

        <View className="flex-1 p-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              {order.items.map((item) => (
                <Text key={item.id} className="text-text text-sm" numberOfLines={1}>
                  {item.quantity}× {item.menuItemName}
                </Text>
              ))}
            </View>
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: config.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: config.color }}>
                {config.label}
              </Text>
            </View>
          </View>

          <OrderProgressTracker status={order.status} />

          {order.status === "ready" && order.pickupDeadline ? (
            <PickupCountdown deadline={order.pickupDeadline} />
          ) : (
            <Text className="text-text opacity-50 text-xs mt-1">
              Placed at {formatTime(order.createdAt)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}