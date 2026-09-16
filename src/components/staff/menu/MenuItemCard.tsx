import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { MenuItem } from "../../../types/menu";

function formatPriceDisplay(item: MenuItem): string {
  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₱${min.toFixed(2)}` : `₱${min.toFixed(2)} – ₱${max.toFixed(2)}`;
  }
  if (item.price !== null) {
    return item.unitLabel ? `₱${item.price.toFixed(2)} · ${item.unitLabel}` : `₱${item.price.toFixed(2)}`;
  }
  return "No price set";
}

type Props = {
  item: MenuItem;
  onToggleAvailable: (id: string) => void;
  onPress: (item: MenuItem) => void;
};

export default function MenuItemCard({ item, onToggleAvailable, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      className={`flex-row items-center bg-card rounded-2xl border border-border px-3 py-3 mb-2.5 ${
        item.available ? "" : "opacity-60"
      }`}
    >
      <View className="w-14 h-14 rounded-xl overflow-hidden bg-backgroundAlt items-center justify-center mr-3">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={22} color="#C9B8BD" />
        )}
      </View>

      <View className="flex-1 mr-3">
        <View className="flex-row items-center">
          <Text className="text-text font-semibold text-[15px] flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          {item.isSpecial && (
            <Ionicons name="star" size={13} color="#D97706" style={{ marginLeft: 6 }} />
          )}
        </View>

        <Text className="text-text opacity-45 text-xs mt-0.5" numberOfLines={1}>
          {item.categoryName ?? "Uncategorized"}
          {item.subcategoryName ? ` · ${item.subcategoryName}` : ""}
          {item.variants.length > 0 ? ` · ${item.variants.length} sizes` : ""}
        </Text>

        <Text className="text-primary font-semibold text-sm mt-1">{formatPriceDisplay(item)}</Text>
      </View>

      <View className="items-center">
        <Switch
          value={item.available}
          onValueChange={() => onToggleAvailable(item.id)}
          trackColor={{ false: "#E5E1E3", true: "#800020" }}
          thumbColor="#fff"
          ios_backgroundColor="#E5E1E3"
        />
        <Text
          className="text-[10px] font-semibold mt-0.5"
          style={{ color: item.available ? "#2E9E44" : "#9CA3AF" }}
        >
          {item.available ? "Available" : "Off"}
        </Text>
      </View>
    </Pressable>
  );
}