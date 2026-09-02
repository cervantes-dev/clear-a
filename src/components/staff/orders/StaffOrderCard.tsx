import { updateOrderStatus } from "@/services/order";
import { Order, OrderStatus } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";

type Props = {
    order: Order;
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    pending: { label: "PENDING", color: "#E69500", bg: "#FFF5E6", icon: "time-outline" },
    preparing: { label: "PREPARING", color: "#F26B1D", bg: "#FFF0E8", icon: "flame-outline" },
    ready: { label: "READY", color: "#2E9E44", bg: "#EAF8EC", icon: "bag-check-outline" },
    completed: { label: "COMPLETED", color: "#2B2B2B", bg: "#ECECF2", icon: "checkmark-circle-outline" },
    cancelled: { label: "CANCELLED", color: "#D32F2F", bg: "#FDECEA", icon: "close-circle-outline" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }>> = {
    pending: { next: "preparing", label: "Start Preparing", icon: "flame-outline" },
    preparing: { next: "ready", label: "Mark Ready", icon: "bag-check-outline" },
};

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StaffOrderCard({ order }: Props) {
    const [updating, setUpdating] = useState(false);
    const config = STATUS_CONFIG[order.status];
    const nextAction = NEXT_STATUS[order.status];

    const handleAdvance = async () => {
        if (!nextAction) return;
        setUpdating(true);
        try {
            await updateOrderStatus(order.id, nextAction.next);
        } catch (err: any) {
            console.error("Failed to update order:", err);
            Alert.alert("Couldn't update order", err?.message ?? "Please try again.");
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        Alert.alert("Cancel this order?", `Order #${order.orderNumber} will be cancelled.`, [
            { text: "Keep order", style: "cancel" },
            {
                text: "Cancel order",
                style: "destructive",
                onPress: async () => {
                    setUpdating(true);
                    try {
                        await updateOrderStatus(order.id, "cancelled");
                    } catch (err: any) {
                        console.error("Failed to cancel order:", err);
                        Alert.alert("Couldn't cancel", err?.message ?? "Please try again.");
                    } finally {
                        setUpdating(false);
                    }
                },
            },
        ]);
    };

    return (
        <View className="bg-white rounded-2xl mb-4 p-4 border border-gray-100">
            <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-text">
                    #{order.orderNumber ? String(order.orderNumber).padStart(3, "0") : "—"}
                </Text>
                <View
                    className="flex-row items-center px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: config.bg }}
                >
                    <Ionicons name={config.icon} size={13} color={config.color} />
                    <Text className="text-xs font-bold ml-1" style={{ color: config.color }}>
                        {config.label}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center mt-1.5">
                <Ionicons name="person-outline" size={14} color="#9CA3AF" />
                <Text className="text-sm text-text opacity-60 ml-1.5">{order.studentName ?? "Unknown student"}</Text>
            </View>

            <View className="border-t border-dashed border-gray-200 mt-3 pt-3">
                {order.items.map((item, index) => (
                    <View
                        key={item.id}
                        className={`flex-row items-center ${index > 0 ? "mt-2.5" : ""}`}
                    >
                        <View className="w-8 h-8 rounded-full bg-gray-50 items-center justify-center mr-2.5">
                            <Ionicons name="fast-food-outline" size={15} color="#9CA3AF" />
                        </View>

                        <Text className="flex-1 text-sm text-text" numberOfLines={1}>
                            {item.quantity}× {item.menuItemName}
                            {item.variantLabel ? ` (${item.variantLabel})` : ""}
                        </Text>

                        {index === 0 ? (
                            <Text className="text-sm font-bold text-primary">₱{order.total.toFixed(2)}</Text>
                        ) : (
                            <View className="flex-row items-center">
                                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                                <Text className="text-xs text-gray-400 ml-1">{formatTime(order.createdAt)}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {order.status === "ready" && (
                <View className="flex-row items-center bg-green-50 rounded-xl mt-3 px-3 py-2.5">
                    <Ionicons name="qr-code-outline" size={16} color="#2E7D32" />
                    <Text className="text-xs text-green-800 ml-2 flex-1">
                        Waiting for student to show pickup QR code
                    </Text>
                </View>
            )}

            {(nextAction || order.status === "pending" || order.status === "preparing") && (
                <View className="flex-row gap-2 mt-3">
                    {nextAction && (
                        <TouchableOpacity
                            onPress={handleAdvance}
                            disabled={updating}
                            className={`flex-1 flex-row items-center justify-center rounded-full py-3 ${updating ? "bg-gray-300" : "bg-primary"
                                }`}
                        >
                            {updating ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name={nextAction.icon} size={16} color="#fff" />
                                    <Text className="text-white text-sm font-bold ml-2">{nextAction.label}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {(order.status === "pending" || order.status === "preparing") && (
                        <TouchableOpacity
                            onPress={handleCancel}
                            disabled={updating}
                            className="flex-1 flex-row items-center justify-center rounded-full py-3 border border-danger"
                        >
                            <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
                            <Text className="text-danger text-sm font-semibold ml-2">Cancel Order</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}