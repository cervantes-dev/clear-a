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

function PulsingBlock({ className }: { className: string }) {
  const opacity = usePulseOpacity();
  return (
    <Animated.View style={{ opacity, flex: 1 }}>
      <SkeletonBlock className={className} />
    </Animated.View>
  );
}

function PulsingRow() {
  const opacity = usePulseOpacity();

  return (
    <Animated.View
      style={{ opacity }}
      className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3 mb-2.5"
    >
      <View className="flex-1 mr-3">
        <SkeletonBlock className="h-3.5 w-3/5 mb-2" />
        <SkeletonBlock className="h-2.5 w-2/5" />
      </View>

      <SkeletonBlock className="h-9 w-24 rounded-full" />
    </Animated.View>
  );
}

type Props = {
  count?: number;
};

export default function InventoryListSkeleton({ count = 7 }: Props) {
  return (
    <View className="px-5">
      <View className="flex-row gap-2 mb-4">
        <PulsingBlock className="h-16 rounded-2xl" />
        <PulsingBlock className="h-16 rounded-2xl" />
        <PulsingBlock className="h-16 rounded-2xl" />
      </View>

      <View className="flex-row items-center gap-2 mb-4">
        <SkeletonBlock className="flex-1 h-11 rounded-full" />
        <SkeletonBlock className="w-11 h-11 rounded-full" />
      </View>

      {Array.from({ length: count }).map((_, i) => (
        <PulsingRow key={i} />
      ))}
    </View>
  );
}