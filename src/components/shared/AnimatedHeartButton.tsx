import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from "react-native-reanimated";
import { haptics } from "../../utils/haptics";

type Props = {
  active: boolean;
  onToggle: () => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  /** Styles the pressable (e.g. the round translucent badge on image cards). */
  className?: string;
};

/**
 * Heart button with a spring "pop" when favoriting (and a small shrink when
 * unfavoriting). The animation is driven by the tap itself, not by the
 * `active` prop changing -- otherwise every heart would pop at once when the
 * favorites list finishes loading.
 */
export default function AnimatedHeartButton({
  active,
  onToggle,
  size = 18,
  activeColor = "#F26B1D",
  inactiveColor = "#C9B8BD",
  className,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = (e: { stopPropagation: () => void }) => {
    // Don't let the tap also open the card behind the heart.
    e.stopPropagation();

    if (active) {
      // becoming un-favorited: quick shrink and settle
      scale.value = withSequence(
        withSpring(0.75, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 300 })
      );
    } else {
      // becoming favorited: overshoot pop
      scale.value = withSequence(
        withSpring(1.45, { damping: 6, stiffness: 420 }),
        withSpring(1, { damping: 9, stiffness: 300 })
      );
    }

    haptics.select();
    onToggle();
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className={className}
    >
      <Animated.View style={animatedStyle}>
        <Ionicons
          name={active ? "heart" : "heart-outline"}
          size={size}
          color={active ? activeColor : inactiveColor}
        />
      </Animated.View>
    </Pressable>
  );
}