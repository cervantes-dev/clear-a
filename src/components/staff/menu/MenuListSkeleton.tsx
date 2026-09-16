import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

function usePulseOpacity() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-backgroundAlt rounded-md ${className}`} />;
}

function PulsingChip({ width }: { width: number }) {
  const opacity = usePulseOpacity();
  return (
    <Animated.View style={{ opacity, width }} className="h-8 rounded-full bg-backgroundAlt mr-2" />
  );
}

function PulsingRow() {
  const opacity = usePulseOpacity();

  return (
    <Animated.View
      style={{ opacity }}
      className="flex-row items-center bg-card rounded-2xl border border-border px-3 py-3 mb-2.5"
    >
      <SkeletonBlock className="w-14 h-14 rounded-xl mr-3" />

      <View className="flex-1 mr-3">
        <SkeletonBlock className="h-3.5 w-3/5 mb-2" />
        <SkeletonBlock className="h-2.5 w-2/5 mb-2" />
        <SkeletonBlock className="h-3 w-1/4" />
      </View>

      <SkeletonBlock className="w-10 h-6 rounded-full" />
    </Animated.View>
  );
}

type Props = {
  count?: number;
};

export default function MenuListSkeleton({ count = 6 }: Props) {
  return (
    <View className="px-5">
      <SkeletonBlock className="h-11 rounded-full mb-4" />

      <View className="flex-row mb-4">
        <PulsingChip width={56} />
        <PulsingChip width={84} />
        <PulsingChip width={70} />
        <PulsingChip width={64} />
      </View>

      {Array.from({ length: count }).map((_, i) => (
        <PulsingRow key={i} />
      ))}
    </View>
  );
}