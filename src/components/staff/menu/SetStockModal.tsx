import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  itemName: string;
  currentStock: number | null; // null = unlimited/no cap set
  saving: boolean;
  onClose: () => void;
  onSetStock: (quantity: number) => void;
  onClearStock: () => void;
};

export default function SetStockModal({
  visible,
  itemName,
  currentStock,
  saving,
  onClose,
  onSetStock,
  onClearStock,
}: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (visible) {
      setValue(currentStock !== null ? String(currentStock) : "");
    }
  }, [visible, currentStock]);

  const parsed = parseInt(value, 10);
  const isValid = value.trim().length > 0 && !isNaN(parsed) && parsed >= 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card rounded-t-3xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-lg font-bold text-text mb-1">Today's Stock</Text>
          <Text className="text-sm text-text opacity-50 mb-4" numberOfLines={1}>
            {itemName}
          </Text>

          <Text className="text-xs text-text opacity-50 mb-2">
            {currentStock === null
              ? "Currently unlimited -- no cap set for today"
              : `Currently capped at ${currentStock} for today`}
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="e.g. 30"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            className="border border-border rounded-xl px-4 py-3 text-base text-text mb-4"
          />

          <TouchableOpacity
            onPress={() => isValid && onSetStock(parsed)}
            disabled={!isValid || saving}
            className={`rounded-full py-3.5 items-center mb-2 ${
              isValid && !saving ? "bg-primary" : "bg-disabled"
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold">Save Stock</Text>
            )}
          </TouchableOpacity>

          {currentStock !== null && (
            <TouchableOpacity
              onPress={onClearStock}
              disabled={saving}
              className="flex-row items-center justify-center py-2"
            >
              <Ionicons name="infinite-outline" size={16} color="#800020" />
              <Text className="text-primary text-sm font-semibold ml-1.5">
                Remove cap (make unlimited)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity className="items-center py-2 mt-1" onPress={onClose}>
            <Text className="text-text opacity-50 text-sm">Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}