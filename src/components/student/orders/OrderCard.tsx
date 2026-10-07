import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, { ZoomIn } from "react-native-reanimated";
import { cancelOrder } from "../../../services/order";
import { Order, OrderStatus } from "../../../types/order";
import CancelOrderModal from "../../shared/CancelOrderModal";
import OrderProgressTracker from "./OrderProgressTracker";
import PickupCountdown from "./PickupCountdown";

type Props = {
  order: Order;
  highlighted?: boolean;
  /** When given, finished orders (completed / cancelled) get an "Order again" button. */
  onReorder?: (order: Order) => void;
  reordering?: boolean;
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

export default function OrderCard({ order, highlighted, onReorder, reordering = false }: Props) {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const config = STATUS_CONFIG[order.status];
  // Students can only cancel before the canteen starts preparing.
  const canCancel = order.status === "pending";
  const canReorder = !!onReorder && (order.status === "completed" || order.status === "cancelled");
  const showQr = order.status === "ready";
  const showTracker = order.status !== "cancelled";
  const message = STATUS_MESSAGES[order.status];

  const orderLabel = order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : undefined;

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      await cancelOrder(order.id);
      setConfirmVisible(false);
    } catch (err: any) {
      console.error("Failed to cancel order:", err);
      setConfirmVisible(false);
      Alert.alert("Couldn't cancel", err?.message ?? "Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View
      className={`bg-card rounded-2xl mb-3 p-4 border ${
        highlighted ? "border-primary" : "border-border"
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-bold text-text">{orderLabel ?? "Order"}</Text>
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

      {order.note ? (
        <View className="flex-row items-start mt-2">
          <Ionicons name="chatbox-ellipses-outline" size={13} color="#9CA3AF" style={{ marginTop: 1 }} />
          <Text className="text-xs text-text opacity-60 ml-1.5 flex-1">{order.note}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-3">
        <Text className="text-sm font-bold text-primary">₱{order.total.toFixed(2)}</Text>

        {order.status === "ready" && order.pickupDeadline && (
          <PickupCountdown deadline={order.pickupDeadline} />
        )}
      </View>

      {showQr && (
        // The QR springs in the moment the order becomes ready. (Reanimated
        // entering animations go on a wrapper with a plain style, not on a
        // className view.)
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <View
            className="items-center bg-background rounded-2xl mt-4 py-5 border border-border"
            accessible
            accessibilityLabel="Pickup QR code. Show this to the canteen staff."
          >
            <QRCode value={order.id} size={148} />
            <Text className="text-xs text-text opacity-50 mt-3 text-center px-6">
              Show this to the canteen staff to confirm pickup
            </Text>
          </View>
        </Animated.View>
      )}

      {canCancel && (
        <TouchableOpacity
          onPress={() => setConfirmVisible(true)}
          className="mt-3 flex-row items-center justify-center border border-danger rounded-full py-2"
        >
          <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
          <Text className="text-danger text-sm font-semibold ml-1.5">Cancel Order</Text>
        </TouchableOpacity>
      )}

      {canReorder && (
        <TouchableOpacity
          onPress={() => onReorder?.(order)}
          disabled={reordering}
          className="mt-3 flex-row items-center justify-center bg-primary/10 rounded-full py-2.5"
          style={{ opacity: reordering ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel={`Order ${orderLabel ?? "this order"} again`}
        >
          <Ionicons name="repeat" size={16} color="#800020" />
          <Text className="text-primary text-sm font-bold ml-1.5">
            {reordering ? "Adding to cart..." : "Order again"}
          </Text>
        </TouchableOpacity>
      )}

      {/* `&& canCancel`: if staff starts preparing while this modal is open,
          the status updates live and the modal closes itself instead of
          letting the student confirm a cancel that's no longer allowed. */}
      <CancelOrderModal
        visible={confirmVisible && canCancel}
        orderLabel={orderLabel}
        loading={cancelling}
        onKeep={() => setConfirmVisible(false)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}