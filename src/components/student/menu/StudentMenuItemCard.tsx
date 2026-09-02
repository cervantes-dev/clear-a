import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { MenuItem } from "../../../types/menu";

type Props = {
  item: MenuItem;
  onPressImage: (item: MenuItem) => void;
};

function formatPrice(item: MenuItem): string {
  if (item.price !== null) {
    const base = `₱${item.price.toFixed(2)}`;
    return item.unitLabel ? `${base} · ${item.unitLabel}` : base;
  }

  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₱${min.toFixed(2)}` : `₱${min.toFixed(2)} – ₱${max.toFixed(2)}`;
  }

  return "Price unavailable";
}

export default function StudentMenuItemCard({ item, onPressImage }: Props) {
  const subtitle = [item.categoryName, item.subcategoryName].filter(Boolean).join(" · ");

  return (
    <View
      className={`flex-row bg-white rounded-2xl mb-3 overflow-hidden border border-gray-100 ${
        !item.available ? "opacity-50" : ""
      }`}
    >
      <TouchableOpacity
        disabled={!item.available}
        onPress={() => onPressImage(item)}
        className="w-20 h-20 m-3 rounded-xl overflow-hidden bg-gray-100 items-center justify-center"
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={28} color="#9CA3AF" />
        )}

        {item.isSpecial && (
          <View className="absolute top-1 left-1 bg-amber-400 rounded-full w-5 h-5 items-center justify-center">
            <Ionicons name="star" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <View className="flex-1 py-3 pr-4 justify-center">
        <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
          {item.name}
        </Text>

        {subtitle.length > 0 && (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        )}

        {item.description && (
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
            {item.description}
          </Text>
        )}

        <Text className="text-sm font-semibold text-primary mt-1.5">
          {item.available ? formatPrice(item) : "Currently unavailable"}
        </Text>
      </View>
    </View>
  );
}