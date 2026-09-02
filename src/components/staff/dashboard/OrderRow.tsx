import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type Order = {
  id: string;
  name: string;
  time: string;
  status: string;
  price: string;
};

function statusStyle(status: string) {
  switch (status) {
    case "Preparing":
      return { bg: "bg-orange-100", text: "text-orange-700" };
    case "Pending":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "Ready":
      return { bg: "bg-green-100", text: "text-green-700" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-700" };
  }
}

export default function OrderRow({ order, isLast }: { order: Order; isLast: boolean }) {
  const badge = statusStyle(order.status);
  return (
    <Pressable className={`flex-row items-center py-3 ${!isLast ? "border-b border-border" : ""}`}>
      <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mr-3">
        <Ionicons name="bag-handle-outline" size={18} color="#800020" />
      </View>
      <View className="flex-1">
        <Text className="text-primary font-bold text-sm">{order.id}</Text>
        <Text className="text-text text-sm">{order.name}</Text>
        <Text className="text-text opacity-50 text-xs">{order.time}</Text>
      </View>
      <View className={`px-3 py-1 rounded-full mr-3 ${badge.bg}`}>
        <Text className={`text-xs font-semibold ${badge.text}`}>{order.status}</Text>
      </View>
      <Text className="text-text font-bold text-sm mr-2">{order.price}</Text>
      <Ionicons name="chevron-forward" size={16} color="#999" />
    </Pressable>
  );
}