import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onTryAgain: () => void;
};

export default function ScanErrorModal({
  visible,
  title,
  message,
  icon = "qr-code-outline",
  onTryAgain,
}: Props) {
  return (
    // Back button and tapping outside both mean "try again": the scanner
    // stays paused while `scanned` is true, so dismissing without resetting
    // it would leave the camera frozen.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onTryAgain}>
      <Pressable className="flex-1 bg-black/40 items-center justify-center px-8" onPress={onTryAgain}>
        {/* Stop propagation so tapping the card itself doesn't dismiss */}
        <Pressable className="w-full bg-card rounded-3xl p-6 items-center" onPress={(e) => e.stopPropagation()}>
          <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-4">
            <Ionicons name={icon} size={26} color="#D32F2F" />
          </View>

          <Text className="text-text text-lg font-bold mb-1.5 text-center">{title}</Text>
          <Text className="text-text opacity-60 text-sm text-center mb-6">{message}</Text>

          <Pressable onPress={onTryAgain} className="w-full bg-primary rounded-xl py-3 items-center">
            <Text className="text-white font-semibold text-sm">Try again</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}