import { ReactNode } from "react";
import { GestureResponderEvent, Pressable, PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { haptics } from "../../utils/haptics";

type HapticKind = "tap" | "select" | "none";

type Props = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  className?: string;
  /** Scale while pressed. Cards ~0.97, small buttons ~0.9. */
  scaleTo?: number;
  haptic?: HapticKind;
};

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Pressable with a springy scale-down on press instead of the flat opacity
 * fade. `className` styles the pressable itself; the wrapper only carries
 * the scale transform.
 */
export default function PressableScale({
  children,
  className,
  scaleTo = 0.97,
  haptic = "none",
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...rest}
        className={className}
        disabled={disabled}
        onPressIn={(e) => {
          if (!disabled) scale.value = withSpring(scaleTo, SPRING);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, SPRING);
          onPressOut?.(e);
        }}
        onPress={(e: GestureResponderEvent) => {
          if (haptic !== "none") haptics[haptic]();
          onPress?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}