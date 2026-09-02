import { MenuItem } from "@/types/menu";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export const LOW_STOCK_THRESHOLD = 5;

type Props = {
  item: MenuItem;
  remaining: number | null; // null = unlimited/no cap set today
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onOpenStockModal: (id: string) => void;
};

export default function InventoryItemRow({
  item,
  remaining,
  onIncrement,
  onDecrement,
  onOpenStockModal,
}: Props) {
  const isUnlimited = remaining === null;
  const isSoldOut = remaining === 0;
  const isLowStock = !isUnlimited && !isSoldOut && remaining! <= LOW_STOCK_THRESHOLD;

  return (
    <View className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 mb-3">
      <View className="flex-1 mr-3">
        <Text className="text-text font-semibold text-sm" numberOfLines={1}>
          {item.name}
        </Text>
        {item.categoryName ? (
          <Text className="text-text opacity-50 text-xs mt-0.5" numberOfLines={1}>
            {item.categoryName}
          </Text>
        ) : null}

        {isSoldOut ? (
          <View className="flex-row items-center mt-1.5 self-start bg-danger/10 rounded-full px-2 py-0.5">
            <Ionicons name="close-circle" size={12} color="#DC2626" />
            <Text className="text-danger text-[11px] font-bold ml-1">Sold out</Text>
          </View>
        ) : isLowStock ? (
          <View className="flex-row items-center mt-1.5 self-start bg-warning/10 rounded-full px-2 py-0.5">
            <Ionicons name="alert-circle" size={12} color="#D97706" />
            <Text className="text-warning text-[11px] font-bold ml-1">Low stock</Text>
          </View>
        ) : null}
      </View>

      {isUnlimited ? (
        <Pressable
          onPress={() => onOpenStockModal(item.id)}
          className="flex-row items-center bg-background rounded-full px-3 py-2 mr-2"
        >
          <Ionicons name="infinite-outline" size={16} color="#800020" />
          <Text className="text-primary text-xs font-semibold ml-1">Unlimited</Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center bg-background rounded-full mr-2">
          <Pressable
            onPress={() => onDecrement(item.id)}
            disabled={remaining === 0}
            hitSlop={8}
            className="w-8 h-8 items-center justify-center"
          >
            <Ionicons name="remove" size={16} color={remaining === 0 ? "#ccc" : "#800020"} />
          </Pressable>
          <Text className="text-text font-bold text-sm w-8 text-center">{remaining}</Text>
          <Pressable onPress={() => onIncrement(item.id)} hitSlop={8} className="w-8 h-8 items-center justify-center">
            <Ionicons name="add" size={16} color="#800020" />
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => onOpenStockModal(item.id)}
        hitSlop={8}
        className="w-8 h-8 items-center justify-center"
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#999" />
      </Pressable>
    </View>
  );
}