import { MenuItem } from "@/types/menu";
import { Ionicons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

type Props = {
  item: MenuItem;
};

function formatPrice(item: MenuItem): string {
  if (item.price !== null) {
    return `₱${item.price.toFixed(2)}`;
  }

  if (item.variants.length > 0) {
    const prices = item.variants.map((v) => v.price);
    const min = Math.min(...prices);
    return `From ₱${min.toFixed(2)}`;
  }

  return "";
}

export default function TodaySpecialCard({ item }: Props) {
  return (
    <View className="w-36 mr-3 bg-card rounded-2xl border border-border overflow-hidden">
      <View className="w-full h-24 bg-backgroundAlt items-center justify-center">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons name="fast-food-outline" size={26} color="#9CA3AF" />
        )}

        <View className="absolute top-1.5 left-1.5 bg-amber-400 rounded-full w-5 h-5 items-center justify-center">
          <Ionicons name="star" size={12} color="#fff" />
        </View>
      </View>

      <View className="p-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-xs font-semibold text-primary mt-1">{formatPrice(item)}</Text>
      </View>
    </View>
  );
}