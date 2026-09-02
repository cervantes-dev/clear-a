import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { OrderStatus } from "../../../types/order";

type Props = {
  status: OrderStatus;
};

const STEPS: { key: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "pending", label: "Placed", icon: "receipt-outline" },
  { key: "preparing", label: "Preparing", icon: "flame-outline" },
  { key: "ready", label: "Ready", icon: "bag-check-outline" },
];

function PulsingIcon({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.25,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={icon} size={16} color="#fff" />
    </Animated.View>
  );
}

export default function OrderProgressTracker({ status }: Props) {
  // Cancelled orders never had a normal lifecycle to visualize -- caller
  // should skip rendering this component entirely for that status.
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  // completed maps onto the same visual as "ready" fully reached
  const effectiveIndex = status === "completed" ? STEPS.length - 1 : currentIndex;

  return (
    <View className="flex-row items-center mt-3 mb-1">
      {STEPS.map((step, index) => {
        const isDone = index < effectiveIndex;
        const isActive = index === effectiveIndex;
        const isPreparing = isActive && status === "preparing";

        return (
          <View key={step.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              {index > 0 && (
                <View
                  className="flex-1 h-0.5"
                  style={{ backgroundColor: index <= effectiveIndex ? "#800020" : "#ECECF2" }}
                />
              )}

              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: isDone || isActive ? "#800020" : "#ECECF2",
                }}
              >
                {isPreparing ? (
                  <PulsingIcon icon={step.icon} />
                ) : (
                  <Ionicons
                    name={isDone ? "checkmark" : step.icon}
                    size={15}
                    color={isDone || isActive ? "#fff" : "#9CA3AF"}
                  />
                )}
              </View>

              {index < STEPS.length - 1 && (
                <View
                  className="flex-1 h-0.5"
                  style={{ backgroundColor: index < effectiveIndex ? "#800020" : "#ECECF2" }}
                />
              )}
            </View>

            <Text
              className="text-[10px] font-semibold mt-1"
              style={{ color: isDone || isActive ? "#800020" : "#9CA3AF" }}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}