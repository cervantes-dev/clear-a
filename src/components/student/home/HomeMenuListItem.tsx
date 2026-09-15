import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MenuItem } from "../../../types/menu";

type Props = {
  item: MenuItem;
  stockRemaining: number | null;
  isFavorite: boolean;
  onPress: (item: MenuItem) => void;
  onToggleFavorite: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
};

const LOW_STOCK_THRESHOLD = 5;

function formatPrice(item: MenuItem): string {
  if (item.price !== null) return `₱${item.price.toFixed(2)}`;
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    return `From ₱${min.toFixed(2)}`;
  }
  return "Unavailable";
}

export default function HomeMenuListItem({
  item,
  stockRemaining,
  isFavorite,
  onPress,
  onToggleFavorite,
  onQuickAdd,
}: Props) {
  const isSoldOut = stockRemaining !== null && stockRemaining <= 0;
  const isLowStock = stockRemaining !== null && stockRemaining > 0 && stockRemaining <= LOW_STOCK_THRESHOLD;
  const disabled = !item.available || isSoldOut;
  const subtitle = [item.categoryName, item.subcategoryName].filter(Boolean).join(" · ");
  const stockColor = isSoldOut ? "#D32F2F" : isLowStock ? "#F26B1D" : "#9CA3AF";

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => onPress(item)}
      className={`flex-row bg-card rounded-2xl mb-3 p-2.5 border border-border ${disabled ? "opacity-50" : ""}`}
    >
      <View className="w-[92px] h-[92px] rounded-xl overflow-hidden bg-backgroundAlt items-center justify-center mr-3">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={30} color="#9CA3AF" />
        )}

        {item.isSpecial && (
          <View className="absolute top-1 left-1 bg-amber-400 rounded-full w-5 h-5 items-center justify-center">
            <Ionicons name="star" size={11} color="#fff" />
          </View>
        )}
      </View>

      <View className="flex-1 justify-between py-0.5">
        <View>
          <View className="flex-row items-start justify-between">
            <Text className="text-sm font-semibold text-text flex-1 pr-2" numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? "#F26B1D" : "#C9B8BD"}
              />
            </TouchableOpacity>
          </View>

          {subtitle.length > 0 ? (
            <Text className="text-[11px] text-text opacity-40 mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : (
            item.description && (
              <Text className="text-[11px] text-text opacity-50 mt-0.5" numberOfLines={1}>
                {item.description}
              </Text>
            )
          )}
        </View>

        <View className="flex-row items-end justify-between">
          <View>
            <Text className="text-sm font-bold text-primary">
              {isSoldOut ? "Sold out" : item.available ? formatPrice(item) : "Unavailable"}
            </Text>
            <Text className="text-[10px] mt-0.5" style={{ color: stockColor }}>
              {isSoldOut ? "Sold out" : stockRemaining === null ? "In stock" : `${stockRemaining} left`}
            </Text>
          </View>

          {!disabled && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onQuickAdd(item);
              }}
              className="flex-row items-center bg-primary rounded-full px-3 py-1.5"
            >
              <Ionicons name="add" size={14} color="#fff" />
              <Text className="text-white text-xs font-bold ml-1">Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}