import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  orderLabel?: string; // e.g. "#012"
  loading?: boolean;
  onKeep: () => void;
  onConfirm: () => void;
};

export default function CancelOrderModal({ visible, orderLabel, loading = false, onKeep, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
      <Pressable
        className="flex-1 bg-black/40 items-center justify-center px-8"
        onPress={loading ? undefined : onKeep}
      >
        {/* Stop propagation so tapping the card itself doesn't dismiss */}
        <Pressable className="w-full bg-card rounded-3xl p-6 items-center" onPress={(e) => e.stopPropagation()}>
          <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name="close-circle-outline" size={28} color="#D32F2F" />
          </View>

          <Text className="text-text text-lg font-bold mb-1.5 text-center">Cancel this order?</Text>
          <Text className="text-text opacity-60 text-sm text-center mb-6">
            {orderLabel ? `Order ${orderLabel}` : "This order"} will be cancelled.{"\n"}This can't be undone.
          </Text>

          <View className="flex-row w-full">
            <Pressable
              onPress={onKeep}
              disabled={loading}
              className="flex-1 border border-border rounded-xl py-3 items-center mr-3"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              <Text className="text-text font-semibold text-sm">Keep order</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className="flex-1 bg-danger rounded-xl py-3 items-center"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-white font-semibold text-sm">
                {loading ? "Cancelling..." : "Cancel order"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}