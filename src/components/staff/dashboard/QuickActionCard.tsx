import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
};

export default function QuickActionCard({ action }: { action: QuickAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      className="w-[23%] bg-card border border-border rounded-2xl items-center justify-center py-4"
    >
      <View className={`w-11 h-11 rounded-full items-center justify-center mb-2 ${action.iconBg}`}>
        <Ionicons name={action.icon} size={20} color={action.iconColor} />
      </View>
      <Text className="text-text text-xs font-medium text-center">{action.label}</Text>
    </Pressable>
  );
}