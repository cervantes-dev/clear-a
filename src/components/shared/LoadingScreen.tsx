import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

const BLADE_COUNT = 8;

function BladeSpinner({ size = 34, color = "#800020" }: { size?: number; color?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const center = size / 2;
  const bladeLength = size * 0.28;
  const bladeWidth = size * 0.09;
  const radius = size * 0.2;

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: BLADE_COUNT }).map((_, i) => {
          const angle = (360 / BLADE_COUNT) * i;
          // Fade each blade based on how far behind the "lead" blade it sits,
          // so the ring reads as a single rotating sweep rather than a static
          // starburst.
          const opacity = 0.15 + (0.85 * (BLADE_COUNT - i)) / BLADE_COUNT;
          const x = center - bladeWidth / 2;
          const y = center - radius - bladeLength;

          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={bladeWidth}
              height={bladeLength}
              rx={bladeWidth / 2}
              fill={color}
              opacity={opacity}
              transform={`rotate(${angle} ${center} ${center})`}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

type Props = {
  label?: string;
};

export default function LoadingScreen({ label = "LOADING" }: Props) {
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#FBF1F2" }}>
      <View className="flex-row items-center">
        <BladeSpinner />
        <Text
          style={{
            color: "#800020",
            fontSize: 22,
            fontWeight: "900",
            letterSpacing: 2,
            marginLeft: 10,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}