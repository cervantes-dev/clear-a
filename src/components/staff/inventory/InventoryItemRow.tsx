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

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 1,
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

  const accentColor = isSoldOut ? "#DC2626" : isLowStock ? "#D97706" : "#fff";

  return (
    <View
      className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 mb-2.5"
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor, ...cardShadow }}
    >
      <View className="flex-1 mr-3">
        <Text className="text-text font-semibold text-sm" numberOfLines={1}>
          {item.name}
        </Text>
        {item.categoryName ? (
          <Text className="text-text opacity-45 text-xs mt-0.5" numberOfLines={1}>
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
          className="flex-row items-center bg-background rounded-full px-3.5 py-2.5"
        >
          <Ionicons name="infinite-outline" size={16} color="#800020" />
          <Text className="text-primary text-xs font-semibold ml-1.5">No limit</Text>
        </Pressable>
      ) : (
        <View className={`flex-row items-center rounded-full ${isSoldOut ? "bg-danger/10" : "bg-background"}`}>
          <Pressable
            onPress={() => onDecrement(item.id)}
            disabled={remaining === 0}
            hitSlop={8}
            className="w-9 h-9 items-center justify-center"
          >
            <Ionicons name="remove" size={16} color={remaining === 0 ? "#D9B8BF" : "#800020"} />
          </Pressable>

          {/* Tap the number to type an exact value */}
          <Pressable onPress={() => onOpenStockModal(item.id)} hitSlop={4}>
            <Text
              className={`font-bold text-base text-center ${isSoldOut ? "text-danger" : "text-text"}`}
              style={{ minWidth: 28 }}
            >
              {remaining}
            </Text>
          </Pressable>

          <Pressable onPress={() => onIncrement(item.id)} hitSlop={8} className="w-9 h-9 items-center justify-center">
            <Ionicons name="add" size={16} color="#800020" />
          </Pressable>
        </View>
      )}
    </View>
  );
}