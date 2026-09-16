import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { NotificationItem } from "../../../types/notification";

const DELETE_WIDTH = 72;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Props = {
  notification: NotificationItem;
  isLast: boolean;
  onDelete: (id: string) => void;
};

export default function NotificationRow({ notification, isLast, onDelete }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  // Separate from Swipeable's own internal drag transform -- this animates
  // the row continuing to slide left and fade out once delete is actually
  // tapped, on top of whatever position the drag already left it in.
  const exitTranslateX = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Animated.parallel([
      Animated.timing(exitTranslateX, {
        toValue: -400,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDelete(notification.id);
    });
  };

  // react-native-gesture-handler passes AnimatedInterpolation values here;
  // typed loosely since the exact generic signature varies across
  // gesture-handler versions.
  const renderRightActions = (_progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-DELETE_WIDTH, 0],
      outputRange: [1, 0],
      extrapolate: "clamp",
    });

    return (
      <Pressable
        onPress={handleDelete}
        style={{ width: DELETE_WIDTH }}
        className="bg-danger items-center justify-center"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Animated.View style={{ transform: [{ translateX: exitTranslateX }], opacity: exitOpacity }}>
        <View className={`flex-row items-start px-5 py-3.5 bg-card ${!isLast ? "border-b border-border" : ""}`}>
          <View
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${notification.color}1A` }}
          >
            <Ionicons name={notification.icon} size={17} color={notification.color} />
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-sm font-semibold text-text">{notification.title}</Text>
            <Text className="text-xs text-text opacity-60 mt-0.5">{notification.message}</Text>
          </View>
          <Text className="text-[10px] text-text opacity-40">{formatRelativeTime(notification.timestamp)}</Text>
        </View>
      </Animated.View>
    </Swipeable>
  );
}