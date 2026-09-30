import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  orderLabel?: string; // e.g. "#012"
  studentName?: string | null;
  onScanNext: () => void;
  onDone: () => void;
};

export default function PickupConfirmedModal({
  visible,
  orderLabel,
  studentName,
  onScanNext,
  onDone,
}: Props) {
  return (
    // Back button = Done. Tapping outside deliberately does nothing, so a
    // stray tap can't dismiss the confirmation mid-scan.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View className="flex-1 bg-black/40 items-center justify-center px-8">
        <View className="w-full bg-card rounded-3xl p-6 items-center">
          <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={30} color="#2E9E44" />
          </View>

          <Text className="text-text text-lg font-bold mb-1.5 text-center">Pickup confirmed</Text>
          <Text className="text-text opacity-60 text-sm text-center mb-6">
            {orderLabel ? `Order ${orderLabel}` : "The order"} has been marked as completed
            {studentName ? `\nfor ${studentName}.` : "."}
          </Text>

          <View className="flex-row w-full">
            <Pressable
              onPress={onDone}
              className="flex-1 border border-border rounded-xl py-3 items-center mr-3"
            >
              <Text className="text-text font-semibold text-sm">Done</Text>
            </Pressable>
            <Pressable onPress={onScanNext} className="flex-1 bg-primary rounded-xl py-3 items-center">
              <Text className="text-white font-semibold text-sm">Scan next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}