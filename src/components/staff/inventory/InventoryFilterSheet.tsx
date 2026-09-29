import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

export type InventoryFilterKey = "all" | "attention" | "soldOut" | "low" | "unlimited";

type Option = {
  key: InventoryFilterKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const INVENTORY_FILTER_OPTIONS: Option[] = [
  { key: "all", label: "All Items", icon: "apps-outline" },
  { key: "attention", label: "Needs Attention", icon: "alert-circle-outline" },
  { key: "soldOut", label: "Sold Out", icon: "close-circle-outline" },
  { key: "low", label: "Low Stock", icon: "warning-outline" },
  { key: "unlimited", label: "No Limit", icon: "infinite-outline" },
];

type Props = {
  visible: boolean;
  selected: InventoryFilterKey;
  counts: Record<InventoryFilterKey, number>;
  onSelect: (key: InventoryFilterKey) => void;
  onClose: () => void;
};

export default function InventoryFilterSheet({ visible, selected, counts, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card rounded-t-3xl pt-3 pb-8 px-2" onPress={(e) => e.stopPropagation()}>
          <View className="w-10 h-1.5 rounded-full bg-border self-center mb-4" />

          <Text className="text-text font-bold text-base px-4 pb-3">Filter by status</Text>

          {INVENTORY_FILTER_OPTIONS.map((opt) => {
            const active = selected === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
                className={`flex-row items-center justify-between px-4 py-3.5 rounded-xl mx-1 ${
                  active ? "bg-primary/10" : "active:bg-background"
                }`}
              >
                <View className="flex-row items-center">
                  <Ionicons name={opt.icon} size={18} color={active ? "#800020" : "#666"} />
                  <Text className={`text-sm ml-3 ${active ? "text-primary font-bold" : "text-text font-medium"}`}>
                    {opt.label}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Text className={`text-xs mr-2 ${active ? "text-primary" : "text-text opacity-40"}`}>
                    {counts[opt.key]}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color="#800020" />}
                </View>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}