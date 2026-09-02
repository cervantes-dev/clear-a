import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

export default function QuickActionButton({ label, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[23%] bg-card border border-border rounded-2xl items-center justify-center py-3.5"
    >
      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-1.5">
        <Ionicons name={icon} size={18} color="#800020" />
      </View>
      <Text className="text-text text-[11px] font-medium text-center" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}