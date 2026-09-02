import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  label: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
};

export default function OrderStatPill({ icon, count, label, iconBg, iconColor, labelColor }: Props) {
  return (
    <View className="flex-1 flex-row items-center bg-card rounded-2xl border border-border py-3 px-3 mx-1">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-2.5"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View>
        <Text className="text-xl font-bold text-text">{count}</Text>
        <Text className="text-xs font-semibold mt-0.5" style={{ color: labelColor }}>
          {label}
        </Text>
      </View>
    </View>
  );
}