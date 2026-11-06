import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { OrderStatus } from "../../../types/order";

type Props = {
  status: OrderStatus;
};

const STEPS: { key: OrderStatus; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "pending", label: "Placed", icon: "receipt-outline" },
  { key: "preparing", label: "Preparing", icon: "flame-outline" },
  { key: "ready", label: "Ready", icon: "bag-check-outline" },
];

const TRACK = "#ECECF2";
const ACCENT = "#800020";
const MUTED = "#9CA3AF";
// How long one half of a connector line takes to fill. Between two circles
// there are two halves (the right half of one step, the left half of the
// next), so they fill one after the other and the next circle lights up last.
const SEGMENT_MS = 220;

/** 0 -> 1 when `reached` turns true (after `delay`), without replaying on first render. */
function useReachedProgress(reached: boolean, delay: number) {
  const progress = useSharedValue(reached ? 1 : 0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    progress.value = reached
      ? withDelay(delay, withTiming(1, { duration: 200 }))
      : withTiming(0, { duration: 150 });
  }, [reached, delay, progress]);

  return progress;
}

function Segment({ filled, delay = 0 }: { filled: boolean; delay?: number }) {
  const fill = useSharedValue(filled ? 1 : 0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    fill.value = filled
      ? withDelay(delay, withTiming(1, { duration: SEGMENT_MS, easing: Easing.out(Easing.quad) }))
      : withTiming(0, { duration: 150 });
  }, [filled, delay, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={{ flex: 1, height: 2, backgroundColor: TRACK, overflow: "hidden" }}>
      <Animated.View style={[{ height: "100%", backgroundColor: ACCENT }, fillStyle]} />
    </View>
  );
}

function StepCircle({
  icon,
  reached,
  done,
  pulsing,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  reached: boolean;
  done: boolean;
  pulsing: boolean;
  delay: number;
}) {
  const progress = useReachedProgress(reached, delay);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const firstPop = useRef(true);

  // Pop when this step becomes reached (not on first render).
  useEffect(() => {
    if (firstPop.current) {
      firstPop.current = false;
      return;
    }
    if (reached) {
      scale.value = withDelay(
        delay,
        withSequence(
          withSpring(1.25, { damping: 6, stiffness: 420 }),
          withSpring(1, { damping: 9, stiffness: 300 })
        )
      );
    }
  }, [reached, delay, scale]);

  // Gentle pulse on the icon while the order is being prepared.
  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(pulse);
  }, [pulsing, pulse]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [TRACK, ACCENT]),
    transform: [{ scale: scale.value }],
  }));
  // Cross-fade a grey icon into a white one instead of switching colors
  // instantly -- otherwise a white icon would flash on the still-light circle
  // while the fill is still catching up.
  const greyIconStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const whiteIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      style={[{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }, circleStyle]}
    >
      <Animated.View style={[{ position: "absolute" }, greyIconStyle]}>
        <Ionicons name={icon} size={15} color={MUTED} />
      </Animated.View>
      <Animated.View style={whiteIconStyle}>
        <Ionicons name={done ? "checkmark" : icon} size={15} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

function StepLabel({ label, reached, delay }: { label: string; reached: boolean; delay: number }) {
  const progress = useReachedProgress(reached, delay);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [MUTED, ACCENT]),
  }));

  return <Animated.Text style={[{ fontSize: 10, fontWeight: "600", marginTop: 4 }, style]}>{label}</Animated.Text>;
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
        const reached = index <= effectiveIndex;
        const isDone = index < effectiveIndex;
        const isActive = index === effectiveIndex;
        // The circle (and its label) light up after the connector has filled.
        const lightUpDelay = index > 0 ? SEGMENT_MS * 2 : 0;

        return (
          <View key={step.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              {index > 0 && <Segment filled={index <= effectiveIndex} delay={SEGMENT_MS} />}

              <StepCircle
                icon={step.icon}
                reached={reached}
                done={isDone}
                pulsing={isActive && status === "preparing"}
                delay={lightUpDelay}
              />

              {index < STEPS.length - 1 && <Segment filled={index < effectiveIndex} />}
            </View>

            <StepLabel label={step.label} reached={reached} delay={lightUpDelay} />
          </View>
        );
      })}
    </View>
  );
}