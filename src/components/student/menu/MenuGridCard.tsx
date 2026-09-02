import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MenuItem } from "../../../types/menu";

type Props = {
  item: MenuItem;
  stockRemaining: number | null;
  onPress: (item: MenuItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (item: MenuItem) => void;
};

const LOW_STOCK_THRESHOLD = 5;

function formatPrice(item: MenuItem): string {
  if (item.price !== null) return `₱${item.price.toFixed(2)}`;
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₱${min.toFixed(2)}` : `₱${min.toFixed(2)} – ₱${max.toFixed(2)}`;
  }
  return "Unavailable";
}

export default function MenuGridCard({
  item,
  stockRemaining,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: Props) {
  const isSoldOut = stockRemaining !== null && stockRemaining <= 0;
  const isLowStock = stockRemaining !== null && stockRemaining > 0 && stockRemaining <= LOW_STOCK_THRESHOLD;
  const disabled = !item.available || isSoldOut;

  const stockLabel = isSoldOut ? "Sold out" : stockRemaining === null ? "Unlimited stock" : `${stockRemaining} left`;
  const stockColor = isSoldOut ? "#D32F2F" : isLowStock ? "#F26B1D" : "#9CA3AF";

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => onPress(item)}
      className={`w-36 mr-3 bg-card rounded-2xl border border-border overflow-hidden ${disabled ? "opacity-50" : ""}`}
    >
      <View className="w-full h-24 bg-backgroundAlt items-center justify-center">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={26} color="#9CA3AF" />
        )}

        {item.isSpecial && (
          <View className="absolute top-1.5 left-1.5 bg-amber-400 rounded-full w-5 h-5 items-center justify-center">
            <Ionicons name="star" size={12} color="#fff" />
          </View>
        )}

        {onToggleFavorite && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/30 items-center justify-center"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={14}
              color={isFavorite ? "#F26B1D" : "#fff"}
            />
          </TouchableOpacity>
        )}

        {isSoldOut && (
          <View
            className={`absolute right-1.5 bg-danger rounded-full px-2 py-0.5 ${
              onToggleFavorite ? "top-8" : "top-1.5"
            }`}
          >
            <Text className="text-white text-[9px] font-bold">Sold Out</Text>
          </View>
        )}
      </View>

      <View className="p-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-xs font-semibold text-primary mt-1">
          {isSoldOut ? "Sold out" : item.available ? formatPrice(item) : "Unavailable"}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="cube-outline" size={10} color={stockColor} />
          <Text className="text-[10px] font-medium ml-1" style={{ color: stockColor }}>
            {stockLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}