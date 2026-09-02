import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { cancelOrder } from "../../../services/order";
import { Order, OrderStatus } from "../../../types/order";
import OrderProgressTracker from "./OrderProgressTracker";
import PickupCountdown from "./PickupCountdown";

type Props = {
  order: Order;
  highlighted?: boolean;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#E69500", bg: "#FFF5E6" },
  preparing: { label: "Preparing", color: "#F26B1D", bg: "#FFF0E8" },
  ready: { label: "Ready for Pickup", color: "#2E9E44", bg: "#EAF8EC" },
  completed: { label: "Completed", color: "#2B2B2B", bg: "#ECECF2" },
  cancelled: { label: "Cancelled", color: "#D32F2F", bg: "#FDECEA" },
};

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  pending: "Order placed! Waiting for the canteen to confirm.",
  preparing: "Preparing your order...",
  ready: "Order ready! Show your QR code at pickup.",
};

export default function OrderCard({ order, highlighted }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const config = STATUS_CONFIG[order.status];
  const canCancel = order.status === "pending" || order.status === "preparing";
  const showQr = order.status === "ready";
  const showTracker = order.status !== "cancelled";
  const message = STATUS_MESSAGES[order.status];

  const handleCancel = () => {
    Alert.alert("Cancel this order?", "This can't be undone.", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelOrder(order.id);
          } catch (err: any) {
            console.error("Failed to cancel order:", err);
            Alert.alert("Couldn't cancel", err?.message ?? "Please try again.");
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <View
      className={`bg-card rounded-2xl mb-3 p-4 border ${
        highlighted ? "border-primary" : "border-border"
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-text">
          {order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : "Order"}
        </Text>
        <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: config.bg }}>
          <Text className="text-xs font-bold" style={{ color: config.color }}>
            {config.label}
          </Text>
        </View>
      </View>

      {showTracker && <OrderProgressTracker status={order.status} />}

      {message && (
        <Text className="text-xs text-text opacity-60 text-center mb-3">{message}</Text>
      )}

      {order.items.map((item) => (
        <Text key={item.id} className="text-sm text-text opacity-70" numberOfLines={1}>
          {item.quantity}× {item.menuItemName}
          {item.variantLabel ? ` (${item.variantLabel})` : ""}
        </Text>
      ))}

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-sm font-bold text-primary">₱{order.total.toFixed(2)}</Text>

        {order.status === "ready" && order.pickupDeadline && (
          <PickupCountdown deadline={order.pickupDeadline} />
        )}
      </View>

      {showQr && (
        <View className="items-center bg-background rounded-2xl mt-4 py-5 border border-border">
          <QRCode value={order.id} size={148} />
          <Text className="text-xs text-text opacity-50 mt-3 text-center px-6">
            Show this to the canteen staff to confirm pickup
          </Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity
          onPress={handleCancel}
          disabled={cancelling}
          className="mt-3 flex-row items-center justify-center border border-danger rounded-full py-2"
        >
          {cancelling ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
              <Text className="text-danger text-sm font-semibold ml-1.5">Cancel Order</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}