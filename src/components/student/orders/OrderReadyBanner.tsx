import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  orderLabel?: string;
  /** Changes for every alert, so the auto-dismiss timer restarts. */
  token: number;
  onPress: () => void;
  onDismiss: () => void;
  durationMs?: number;
};

export default function OrderReadyBanner({ orderLabel, token, onPress, onDismiss, durationMs = 6000 }: Props) {
  const insets = useSafeAreaInsets();

  // Latest onDismiss in a ref so an inline arrow from the parent doesn't
  // restart the timer on every render.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [token, durationMs]);

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(18)}
      exiting={SlideOutUp.duration(200)}
      style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, zIndex: 50, elevation: 12 }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${orderLabel ? `Order ${orderLabel}` : "Your order"} is ready. Tap to view your pickup code.`}
        className="flex-row items-center bg-card rounded-2xl pl-3 pr-2 py-3 border border-green-200"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
        }}
      >
        <View className="w-10 h-10 rounded-full bg-statusReadyBg items-center justify-center mr-3">
          <Ionicons name="bag-check" size={20} color="#2E9E44" />
        </View>

        <View className="flex-1">
          <Text className="text-text font-bold text-sm">
            {orderLabel ? `Order ${orderLabel}` : "Your order"} is ready!
          </Text>
          <Text className="text-text opacity-60 text-xs mt-0.5">Show your QR code at the counter</Text>
        </View>

        <Pressable onPress={onDismiss} hitSlop={10} className="p-2" accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color="#999" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}