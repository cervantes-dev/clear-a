import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: any;
};

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dashboard: "home-outline",
  home: "home-outline",
  orders: "receipt-outline",
  favorites: "heart-outline",
  menu: "restaurant-outline",
  inventory: "cube-outline",
  profile: "person-outline",
};

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  home: "Home",
  orders: "Orders",
  favorites: "Favorites",
  menu: "Menu",
  inventory: "Inventory",
  profile: "Profile",
};

const FAB_SIZE = 50;
const BAR_HEIGHT = 54;
const BAR_RADIUS = 20;
// Per-tab horizontal padding -- tabs are sized to their content (icon +
// label) plus this, instead of flex-stretching evenly across the full
// screen width. Keeps the bar a compact centered pill rather than a bar
// with large empty gaps between only 3-4 items.
const TAB_H_PADDING = 12;
const BAR_H_PADDING = 6;

// Breathing room above the system nav bar / home indicator so the floating
// bar still reads as detached from it, without sitting as high up as before.
const BOTTOM_GAP = 14;
// Floor in case insets.bottom under-reports on some devices/emulators
// (e.g. translucent nav bar configs that don't always push a nonzero
// inset) - guarantees the bar never sits flush against the nav bar.
const MIN_BOTTOM_OFFSET = 24;

const floatingShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 8,
};

const fabShadow = {
  shadowColor: "#800020",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 10,
};

// Shared bounce: quick pop past 1.0, then a springy settle back to 1.0.
function useBounce() {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.3,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, bounce };
}

function TabButton({
  isActive,
  icon,
  label,
  onPress,
}: {
  isActive: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { scale, bounce } = useBounce();

  const handlePress = () => {
    bounce();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="items-center justify-center"
      style={{ paddingHorizontal: TAB_H_PADDING }}
      hitSlop={8}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={icon} size={19} color={isActive ? "#800020" : "#999"} />
      </Animated.View>
      <Text
        className={`text-[10px] mt-0.5 ${
          isActive ? "text-primary font-bold" : "text-text opacity-50"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ScanFab({ onPress }: { onPress: () => void }) {
  const { scale, bounce } = useBounce();

  const handlePress = () => {
    bounce();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        position: "absolute",
        top: -(FAB_SIZE / 2) + 10,
        left: "50%",
        marginLeft: -FAB_SIZE / 2,
        width: FAB_SIZE,
        height: FAB_SIZE,
      }}
    >
      <Animated.View
        style={{
          flex: 1,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: "#800020",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: Platform.OS === "ios" ? "#fff" : "transparent",
          transform: [{ scale }],
          ...fabShadow,
        }}
      >
        <Ionicons name="qr-code-outline" size={22} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

export default function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + BOTTOM_GAP, MIN_BOTTOM_OFFSET);

  // Hidden routes (href: null screens like "cart" or "scan") are full-screen
  // flows -- checkout, camera -- that already have their own back/close
  // affordance. The floating bar has no meaningful "active tab" to show
  // there and would otherwise just float on top of that screen's own
  // bottom-anchored UI, so don't render it at all while one is focused.
  const focusedRouteName = state.routes[state.index]?.name;
  if (!focusedRouteName || !(focusedRouteName in LABELS)) {
    return null;
  }

  const scanRoute = state.routes.find((r) => r.name === "scan");
  const hasFab = !!scanRoute;

  const visibleRoutes = state.routes.filter(
    (route) => route.name in LABELS && !(hasFab && route.name === "profile")
  );

  const navigateTo = (routeName: string, routeKey: string) => {
    const isActive = state.index === state.routes.findIndex((r) => r.key === routeKey);
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isActive && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const renderTab = (route: { key: string; name: string }) => {
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const isActive = state.index === routeIndex;
    const icon = ICONS[route.name] ?? "ellipse-outline";
    const label = LABELS[route.name] ?? route.name;

    return (
      <TabButton
        key={route.key}
        isActive={isActive}
        icon={icon}
        label={label}
        onPress={() => navigateTo(route.name, route.key)}
      />
    );
  };

  if (!hasFab) {
    return (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", bottom: bottomOffset, alignSelf: "center" }}
      >
        <View
          className="flex-row items-center bg-card"
          style={{ height: BAR_HEIGHT, borderRadius: BAR_RADIUS, paddingHorizontal: BAR_H_PADDING, ...floatingShadow }}
        >
          {visibleRoutes.map(renderTab)}
        </View>
      </View>
    );
  }

  const mid = Math.ceil(visibleRoutes.length / 2);
  const leftRoutes = visibleRoutes.slice(0, mid);
  const rightRoutes = visibleRoutes.slice(mid);

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", bottom: bottomOffset, alignSelf: "center" }}
    >
      <View
        className="flex-row items-center bg-card"
        style={{ height: BAR_HEIGHT, borderRadius: BAR_RADIUS, paddingHorizontal: BAR_H_PADDING, ...floatingShadow }}
      >
        <View className="flex-row">{leftRoutes.map(renderTab)}</View>
        <View style={{ width: FAB_SIZE + 16 }} />
        <View className="flex-row">{rightRoutes.map(renderTab)}</View>
      </View>

      <ScanFab onPress={() => navigateTo(scanRoute!.name, scanRoute!.key)} />
    </View>
  );
}