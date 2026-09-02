// components/student/home/PickupInfoModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const STEPS = [
  { icon: "receipt-outline" as const, text: "Place your order and wait for staff to start preparing it." },
  { icon: "flame-outline" as const, text: "You'll see live status updates as it's being prepared." },
  { icon: "bag-check-outline" as const, text: "Once marked \"Ready\", head to the canteen counter." },
  { icon: "qr-code-outline" as const, text: "Show your order's QR code to staff to confirm pickup." },
  { icon: "time-outline" as const, text: "Ready orders must be picked up within 10 minutes." },
];

export default function PickupInfoModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
        <Pressable className="bg-card rounded-t-3xl px-5 pt-5 pb-8" onPress={(e) => e.stopPropagation()}>
          <View className="items-center mb-4">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>

          <Text className="text-lg font-bold text-text mb-4">How Pickup Works</Text>

          {STEPS.map((step, i) => (
            <View key={i} className="flex-row items-start mb-3.5">
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Ionicons name={step.icon} size={16} color="#800020" />
              </View>
              <Text className="text-text text-sm flex-1 leading-5 mt-1.5">{step.text}</Text>
            </View>
          ))}

          <Pressable onPress={onClose} className="bg-primary rounded-full py-3.5 items-center mt-2">
            <Text className="text-white font-bold">Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}