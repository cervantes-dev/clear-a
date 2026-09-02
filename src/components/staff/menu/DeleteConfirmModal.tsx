import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

export default function DeleteConfirmModal({
  visible,
  title = "Delete Item?",
  itemName,
  message,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title?: string;
  itemName: string;
  message?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-8" onPress={onCancel}>
        {/* Stop propagation so tapping the card itself doesn't dismiss */}
        <Pressable className="w-full bg-card rounded-3xl p-6 items-center" onPress={(e) => e.stopPropagation()}>
          <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="trash-outline" size={26} color="#EF4444" />
          </View>

          <Text className="text-text text-lg font-bold mb-1.5 text-center">{title}</Text>
          <Text className="text-text opacity-60 text-sm text-center mb-6">
            {message ?? (
              <>
                This will permanently remove{"\n"}
                <Text className="font-semibold">{itemName}</Text> from your menu.
              </>
            )}
          </Text>

          <View className="flex-row w-full">
            <Pressable
              onPress={onCancel}
              className="flex-1 border border-border rounded-xl py-3 items-center mr-3"
            >
              <Text className="text-text font-semibold text-sm">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="flex-1 bg-red-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold text-sm">Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}