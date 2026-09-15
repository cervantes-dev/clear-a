// components/student/home/HomeMenuCard.tsx
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

function formatPrice(item: MenuItem): string {
  if (item.price !== null) return `₱${item.price.toFixed(2)}`;
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    return `From ₱${min.toFixed(2)}`;
  }
  return "Unavailable";
}

export default function HomeMenuCard({
  item,
  stockRemaining,
  isFavorite,
  onPress,
  onToggleFavorite,
  onQuickAdd,
}: Props) {
  const isSoldOut = stockRemaining !== null && stockRemaining <= 0;
  const disabled = !item.available || isSoldOut;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={() => onPress(item)}
      className={`w-40 mr-3 bg-card rounded-2xl border border-border overflow-hidden ${disabled ? "opacity-50" : ""}`}
    >
      <View className="w-full h-24 bg-backgroundAlt items-center justify-center">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={26} color="#9CA3AF" />
        )}

        <View
          className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5"
          style={{ backgroundColor: isSoldOut ? "#D32F2F" : "#2E9E44" }}
        >
          <Text className="text-white text-[9px] font-bold">
            {isSoldOut ? "Sold Out" : "Available"}
          </Text>
        </View>

        {item.isSpecial && (
          <View className="absolute bottom-1.5 left-1.5 bg-amber-400 rounded-full w-5 h-5 items-center justify-center">
            <Ionicons name="star" size={12} color="#fff" />
          </View>
        )}

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
      </View>

      <View className="p-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {item.name}
        </Text>

        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-xs font-semibold text-primary flex-1" numberOfLines={1}>
            {isSoldOut ? "Sold out" : item.available ? formatPrice(item) : "Unavailable"}
          </Text>

          {!disabled && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onQuickAdd(item);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-7 h-7 rounded-full bg-primary items-center justify-center ml-2"
            >
              <Ionicons name="add" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}