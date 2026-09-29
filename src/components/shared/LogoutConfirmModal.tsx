import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function LogoutConfirmModal({ visible, loading = false, onCancel, onConfirm }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 bg-black/40 items-center justify-center px-8"
        onPress={loading ? undefined : onCancel}
      >
        {/* Stop propagation so tapping the card itself doesn't dismiss */}
        <Pressable className="w-full bg-card rounded-3xl p-6 items-center" onPress={(e) => e.stopPropagation()}>
          <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="log-out-outline" size={26} color="#800020" />
          </View>

          <Text className="text-text text-lg font-bold mb-1.5 text-center">Log out?</Text>
          <Text className="text-text opacity-60 text-sm text-center mb-6">
            You'll need to sign in again to{"\n"}place or manage orders.
          </Text>

          <View className="flex-row w-full">
            <Pressable
              onPress={onCancel}
              disabled={loading}
              className="flex-1 border border-border rounded-xl py-3 items-center mr-3"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              <Text className="text-text font-semibold text-sm">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className="flex-1 bg-danger rounded-xl py-3 items-center"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-white font-semibold text-sm">{loading ? "Logging out..." : "Log out"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}