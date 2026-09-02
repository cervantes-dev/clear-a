import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

type Props = {
  uri: string;
  source: Rect;
  target: Point;
  onComplete: () => void;
};

const FLIGHT_SIZE = 56; // fixed small starting size, regardless of the modal image's real dimensions

export default function FlyingCartAnimation({ uri, source, target, onComplete }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 550,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete();
    });
  }, []);

  // Start centered on the source rect (the tapped image), but at the small fixed size
  const startX = source.x + source.width / 2 - FLIGHT_SIZE / 2;
  const startY = source.y + source.height / 2 - FLIGHT_SIZE / 2;

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, target.x - (startX + FLIGHT_SIZE / 2)],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, target.y - (startY + FLIGHT_SIZE / 2)],
  });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  const opacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0.3] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image
        source={{ uri }}
        resizeMode="cover"
        style={{
          position: "absolute",
          left: startX,
          top: startY,
          width: FLIGHT_SIZE,
          height: FLIGHT_SIZE,
          borderRadius: 10,
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        }}
      />
    </View>
  );
}