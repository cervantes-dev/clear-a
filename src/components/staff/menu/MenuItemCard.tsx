import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { MenuItem } from "../../../types/menu";

function formatPriceDisplay(item: MenuItem): string {
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₱${min.toFixed(2)}` : `₱${min.toFixed(2)} - ₱${max.toFixed(2)}`;
  }
  if (item.price !== null) {
    return item.unitLabel ? `₱${item.price.toFixed(2)} / ${item.unitLabel}` : `₱${item.price.toFixed(2)}`;
  }
  return "—";
}

type Props = {
  item: MenuItem;
  stockRemaining: number | null; // null = no cap set today = unlimited
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetStock?: (id: string) => void;
};

export default function MenuItemCard({
  item,
  stockRemaining,
  onToggle,
  onEdit,
  onDelete,
  onSetStock,
}: Props) {
  const isOutOfStock = stockRemaining !== null && stockRemaining <= 0;
  const isAvailable = item.available && !isOutOfStock;

  const stockLabel = stockRemaining === null ? "Stock: Unlimited" : `Stock: ${stockRemaining}`;

  return (
    <View className="bg-card border border-border rounded-2xl p-4 mb-3">
      <View className="flex-row items-center">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: 52, height: 52, borderRadius: 12 }} />
        ) : (
          <View className="w-[52px] h-[52px] rounded-xl bg-primary/10 items-center justify-center">
            <Ionicons name="fast-food-outline" size={22} color="#800020" />
          </View>
        )}

        <View className="flex-1 ml-3">
          <View className="flex-row items-center flex-wrap">
            <Text className="text-text font-bold text-sm">{item.name}</Text>
            {item.isSpecial && (
              <View className="flex-row items-center bg-yellow-100 rounded-full px-2 py-0.5 ml-2">
                <Ionicons name="star" size={10} color="#D97706" />
                <Text className="text-yellow-700 text-[10px] font-semibold ml-1">Special</Text>
              </View>
            )}
            {item.variants.length > 0 && (
              <View className="bg-blue-100 rounded-full px-2 py-0.5 ml-2">
                <Text className="text-blue-700 text-[10px] font-semibold">
                  {item.variants.length} sizes
                </Text>
              </View>
            )}
          </View>

          <Text className="text-text opacity-50 text-xs mt-0.5">
            {item.categoryName ?? "Uncategorized"}
            {item.subcategoryName ? ` · ${item.subcategoryName}` : ""}
          </Text>
        </View>

        <Text className="text-primary font-bold text-sm ml-2">{formatPriceDisplay(item)}</Text>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-border">
        <Pressable onPress={() => onToggle(item.id)} className="flex-row items-center flex-1">
          <View
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: isAvailable ? "#2E9E44" : "#D32F2F" }}
          />
          <Text
            className="text-xs font-semibold mr-3"
            style={{ color: isAvailable ? "#2E9E44" : "#D32F2F" }}
          >
            {isOutOfStock ? "Out of Stock" : item.available ? "Available" : "Unavailable"}
          </Text>

          <Text className="text-text opacity-40 text-xs">{stockLabel}</Text>
        </Pressable>
      </View>

      <View className="flex-row gap-2 mt-2.5">
        <Pressable
          onPress={() => onSetStock?.(item.id)}
          className="flex-1 flex-row items-center justify-center border border-border rounded-full py-1.5"
        >
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text className="text-text text-xs font-semibold ml-1">Stock</Text>
        </Pressable>

        <Pressable
          onPress={() => onEdit?.(item.id)}
          className="flex-1 flex-row items-center justify-center border border-border rounded-full py-1.5"
        >
          <Ionicons name="create-outline" size={14} color="#666" />
          <Text className="text-text text-xs font-semibold ml-1">Edit</Text>
        </Pressable>

        <Pressable
          onPress={() => onDelete?.(item.id)}
          className="flex-1 flex-row items-center justify-center border border-danger rounded-full py-1.5"
        >
          <Ionicons name="trash-outline" size={14} color="#D32F2F" />
          <Text className="text-danger text-xs font-semibold ml-1">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}