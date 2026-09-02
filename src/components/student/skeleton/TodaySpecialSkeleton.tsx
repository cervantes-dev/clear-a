import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-backgroundAlt rounded-md ${className}`} />;
}

function PulsingCard() {
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

  return (
    <Animated.View
      style={{ opacity }}
      className="w-36 mr-3 bg-card rounded-2xl border border-border overflow-hidden"
    >
      <View className="w-full h-24 bg-backgroundAlt" />

      <View className="p-2.5">
        <SkeletonBlock className="h-3.5 w-4/5 mb-2" />
        <SkeletonBlock className="h-3 w-1/2" />
      </View>
    </Animated.View>
  );
}

type Props = {
  count?: number;
};

export default function TodaySpecialSkeleton({ count = 4 }: Props) {
  return (
    <View className="flex-row px-5">
      {Array.from({ length: count }).map((_, i) => (
        <PulsingCard key={i} />
      ))}
    </View>
  );
}