import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type Stat = {
  key: string;
  label: string;
  value: string;
  note: string;
  noteColor: string;
  icon: keyof typeof Ionicons.glyphMap | null;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
};

export default function StatCard({ stat }: { stat: Stat }) {
  const content = (
    <>
      <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${stat.iconBg}`}>
        {stat.icon ? (
          <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
        ) : (
          <Text style={{ color: stat.iconColor }} className="text-lg font-bold">
            ₱
          </Text>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-text opacity-70 text-xs mb-0.5" numberOfLines={1}>
          {stat.label}
        </Text>
        <Text className="text-text text-xl font-bold" numberOfLines={1}>
          {stat.value}
        </Text>
        <Text className={`text-[11px] font-medium ${stat.noteColor}`} numberOfLines={1}>
          {stat.note}
        </Text>
      </View>

      {stat.onPress && <Ionicons name="chevron-forward" size={16} color="#C9C9C9" />}
    </>
  );

  if (stat.onPress) {
    return (
      <Pressable
        onPress={stat.onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        className="w-[48%] flex-row items-center bg-card border border-border rounded-2xl p-3.5 mb-4"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className="w-[48%] flex-row items-center bg-card border border-border rounded-2xl p-3.5 mb-4">
      {content}
    </View>
  );
}