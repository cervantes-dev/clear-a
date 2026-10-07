import { useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

type Props = {
  message: string;
  /** Without an action label and handler it's a plain message toast. */
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  /** Changes whenever a new message replaces the current one, restarting the timer. */
  token: number | string;
  /** Distance from the bottom of the parent, so it can sit above a footer or the tab bar. */
  bottom: number;
  durationMs?: number;
};

export default function UndoSnackbar({
  message,
  actionLabel,
  onAction,
  onDismiss,
  token,
  bottom,
  durationMs = 5000,
}: Props) {
  // Latest onDismiss in a ref: an inline arrow from the parent would
  // otherwise change identity every render and keep restarting the timer.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [token, durationMs]);

  const hasAction = !!actionLabel && !!onAction;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown.duration(180)}
      style={{ position: "absolute", left: 16, right: 16, bottom }}
    >
      <View
        className={`flex-row items-center rounded-2xl py-2 ${hasAction ? "pl-4 pr-2" : "px-4 py-3"}`}
        style={{
          backgroundColor: "#2B2B2B",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Text className="flex-1 text-white text-sm" numberOfLines={2}>
          {message}
        </Text>
        {hasAction && (
          <Pressable onPress={onAction} hitSlop={8} className="px-3 py-2">
            <Text className="text-amber-400 text-sm font-bold">{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}