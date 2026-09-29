import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Order } from "../../../types/order";

type Props = {
  visible: boolean;
  orders: Order[]; // pending orders, most recent first
  onClose: () => void;
  onSelect: (order: Order) => void;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function StaffNotificationSheet({ visible, orders, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable
          className="bg-card rounded-t-3xl pt-3 pb-6 px-2 max-h-[70%]"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-10 h-1.5 rounded-full bg-border self-center mb-4" />

          <View className="flex-row items-center justify-between px-4 pb-3 mb-1 border-b border-border">
            <Text className="text-text font-bold text-base">Notifications</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={20} color="#666" />
            </Pressable>
          </View>

          {orders.length === 0 ? (
            <View className="items-center py-10 px-4">
              <Ionicons name="notifications-off-outline" size={28} color="#D1D5DB" />
              <Text className="text-text opacity-50 text-sm mt-3 text-center">
                You're all caught up. No new orders waiting.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {orders.map((order) => (
                <Pressable
                  key={order.id}
                  onPress={() => onSelect(order)}
                  className="flex-row items-center px-4 py-3 active:bg-background rounded-xl mx-1"
                >
                  <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center mr-3">
                    <Ionicons name="receipt-outline" size={16} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text text-sm font-semibold" numberOfLines={1}>
                      New order {order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : ""}
                    </Text>
                    <Text className="text-text opacity-50 text-xs mt-0.5" numberOfLines={1}>
                      {order.studentName ?? "Unknown student"} · ₱{order.total.toFixed(2)}
                    </Text>
                  </View>
                  <Text className="text-text opacity-40 text-[11px]">{formatTime(order.createdAt)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}