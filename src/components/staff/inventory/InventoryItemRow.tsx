import { MenuItem } from "@/types/menu";
import { haptics } from "@/utils/haptics";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

export const LOW_STOCK_THRESHOLD = 5;

type Props = {
  item: MenuItem;
  remaining: number | null; // null = no cap set today
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onOpenStockModal: (id: string) => void;
};

const STATUS = {
  soldOut: { label: "Sold out", color: "#D32F2F", bg: "#FDECEA", icon: "close-circle" },
  low: { label: "Low stock", color: "#D97706", bg: "#FFF5E6", icon: "alert-circle" },
  ok: { label: "In stock", color: "#2E9E44", bg: "#EAF8EC", icon: "checkmark-circle" },
  unlimited: { label: "No limit set", color: "#6B7280", bg: "#F3F4F6", icon: "infinite" },
} as const;

export default function InventoryItemRow({
  item,
  remaining,
  onIncrement,
  onDecrement,
  onOpenStockModal,
}: Props) {
  const status =
    remaining === null
      ? "unlimited"
      : remaining === 0
      ? "soldOut"
      : remaining <= LOW_STOCK_THRESHOLD
      ? "low"
      : "ok";
  const s = STATUS[status];

  // "Resets daily" explains why a perishable item starts every morning at 0.
  const subtitle = [item.categoryName, item.carriesOverStock ? "Carries over" : "Resets daily"]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-center bg-card border border-border rounded-2xl mb-3 overflow-hidden">
      {/* Status rail: readable at a glance while scrolling */}
      <View style={{ width: 4, alignSelf: "stretch", backgroundColor: s.color }} />

      <View className="flex-row items-center flex-1 p-3">
        <View className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-backgroundAlt items-center justify-center">
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: "100%", opacity: item.available ? 1 : 0.5 }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="fast-food-outline" size={22} color="#9CA3AF" />
          )}
        </View>

        <View className="flex-1 mx-3">
          <Text className="text-text font-semibold text-sm" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-text opacity-50 text-[11px] mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>

          <View className="flex-row flex-wrap items-center mt-1.5">
            {status !== "ok" && (
              <View
                className="flex-row items-center rounded-full px-2 py-0.5 mr-1.5"
                style={{ backgroundColor: s.bg }}
              >
                <Ionicons name={s.icon} size={11} color={s.color} />
                <Text className="text-[10px] font-bold ml-1" style={{ color: s.color }}>
                  {s.label}
                </Text>
              </View>
            )}

            {!item.available && (
              <View className="flex-row items-center rounded-full px-2 py-0.5 bg-gray-100">
                <Ionicons name="eye-off-outline" size={11} color="#6B7280" />
                <Text className="text-[10px] font-bold ml-1 text-gray-500">Off menu</Text>
              </View>
            )}
          </View>
        </View>

        {status === "unlimited" ? (
          <Pressable
            onPress={() => onOpenStockModal(item.id)}
            className="flex-row items-center border border-primary rounded-full px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel={`Set stock for ${item.name}`}
          >
            <Ionicons name="create-outline" size={14} color="#800020" />
            <Text className="text-primary text-xs font-bold ml-1">Set stock</Text>
          </Pressable>
        ) : status === "soldOut" ? (
          <Pressable
            onPress={() => onOpenStockModal(item.id)}
            className="flex-row items-center bg-primary rounded-full px-3.5 py-2"
            accessibilityRole="button"
            accessibilityLabel={`Restock ${item.name}`}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text className="text-white text-xs font-bold ml-1">Restock</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={() => {
                haptics.select();
                onDecrement(item.id);
              }}
              hitSlop={6}
              className="w-10 h-10 rounded-full bg-background items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Decrease stock of ${item.name}`}
            >
              <Ionicons name="remove" size={18} color="#800020" />
            </Pressable>

            {/* Tap the number to type an exact amount */}
            <Pressable
              onPress={() => onOpenStockModal(item.id)}
              className="w-14 h-11 mx-1.5 rounded-xl border items-center justify-center"
              style={{ borderColor: `${s.color}66` }}
              accessibilityRole="button"
              accessibilityLabel={`${remaining} left. Tap to set an exact amount.`}
            >
              <Text
                className="text-base font-bold"
                style={{ color: status === "low" ? s.color : "#2B2B2B" }}
              >
                {remaining}
              </Text>
              <Text className="text-text opacity-40 text-[9px] -mt-0.5">left</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                haptics.select();
                onIncrement(item.id);
              }}
              hitSlop={6}
              className="w-10 h-10 rounded-full bg-background items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Increase stock of ${item.name}`}
            >
              <Ionicons name="add" size={18} color="#800020" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}