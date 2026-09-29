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
    <Animated.View style={{ opacity }}>
      <SkeletonBlock className={className} />
    </Animated.View>
  );
}

export default function DashboardSkeleton() {
  return (
    <View className="px-5">
      <PulsingBlock className="h-16 rounded-2xl mb-4" />

      <PulsingBlock className="h-5 w-32 rounded-md mb-2" />
      <PulsingBlock className="h-3 w-24 rounded-md mb-3" />

      <View className="flex-row flex-wrap justify-between">
        <PulsingBlock className="w-[48%] h-20 rounded-2xl mb-4" />
        <PulsingBlock className="w-[48%] h-20 rounded-2xl mb-4" />
        <PulsingBlock className="w-[48%] h-20 rounded-2xl mb-4" />
        <PulsingBlock className="w-[48%] h-20 rounded-2xl mb-4" />
      </View>

      <PulsingBlock className="h-5 w-28 rounded-md mb-3 mt-1" />
      <PulsingBlock className="h-10 rounded-full mb-4" />
      <PulsingBlock className="h-40 rounded-2xl mb-6" />

      <PulsingBlock className="h-5 w-32 rounded-md mb-3" />
      <PulsingBlock className="h-40 rounded-2xl mb-6" />
    </View>
  );
}