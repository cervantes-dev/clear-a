import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { CanteenStatus } from "../../services/canteen";
import { describeClosure } from "../../utils/canteen";

type Props = {
  status: CanteenStatus;
  /** Adds a shadow, for when it floats over other content. */
  elevated?: boolean;
};

export default function CanteenClosedBanner({ status, elevated = false }: Props) {
  const { title, subtitle } = describeClosure(status);

  return (
    <View
      className="flex-row items-center bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={
        elevated
          ? {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 10,
              elevation: 6,
            }
          : undefined
      }
    >
      <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center mr-3">
        <Ionicons
          name={status.reason === "before_open" ? "time-outline" : "moon-outline"}
          size={18}
          color="#D97706"
        />
      </View>
      <View className="flex-1">
        <Text className="text-text font-semibold text-sm">{title}</Text>
        <Text className="text-text opacity-60 text-xs mt-0.5">{subtitle}</Text>
      </View>
    </View>
  );
}