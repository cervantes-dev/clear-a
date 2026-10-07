import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { LayoutChangeEvent, Platform, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../utils/haptics";

type AppTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: any;
  /** Badge count per route name, e.g. { orders: 2 }. 0 / missing = no badge. */
  badges?: Record<string, number>;
};

// [outline, filled] -- the filled glyph shows on the active tab.
const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  dashboard: ["home-outline", "home"],
  home: ["home-outline", "home"],
  orders: ["receipt-outline", "receipt"],
  favorites: ["heart-outline", "heart"],
  menu: ["restaurant-outline", "restaurant"],
  inventory: ["cube-outline", "cube"],
  profile: ["person-outline", "person"],
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
// Tabs are sized to their content plus this padding (with a small floor so
// short labels like "Home" don't make the sliding pill look cramped),
// keeping the bar a compact centered pill rather than stretching edge to edge.
const TAB_H_PADDING = 12;
const TAB_MIN_WIDTH = 64;
const BAR_H_PADDING = 6;
// Vertical breathing room between the sliding pill and the bar's edge.
const INDICATOR_INSET = 6;

// Breathing room above the system nav bar / home indicator so the floating
// bar still reads as detached from it, without sitting as high up as before.
const BOTTOM_GAP = 14;
// Floor in case insets.bottom under-reports on some devices/emulators
// (e.g. translucent nav bar configs that don't always push a nonzero
// inset) - guarantees the bar never sits flush against the nav bar.
const MIN_BOTTOM_OFFSET = 24;

const SLIDE_SPRING = { damping: 18, stiffness: 220, mass: 0.8 };

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
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bounce = () => {
    scale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 6, stiffness: 260 })
    );
  };

  return { style, bounce };
}

function TabBadge({ count }: { count: number }) {
  const scale = useSharedValue(1);
  const prev = useRef(count);

  // Pop when the count goes up while the badge is already showing. The first
  // appearance is handled by the entering animation below instead.
  useEffect(() => {
    if (count > prev.current) {
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 420 }),
        withSpring(1, { damping: 9, stiffness: 300 })
      );
    }
    prev.current = count;
  }, [count, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    // Outer view owns the enter/exit animation, inner view owns the pop:
    // Reanimated layout animations and a transform on the same view fight.
    <Animated.View
      entering={ZoomIn.springify()}
      exiting={ZoomOut.duration(150)}
      style={{ position: "absolute", top: -7, right: -11 }}
    >
      <Animated.View
        style={[
          {
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: "#D32F2F",
            borderWidth: 1.5,
            borderColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          },
          popStyle,
        ]}
      >
        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
          {count > 9 ? "9+" : count}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function TabButton({
  isActive,
  icons,
  label,
  badge,
  onPress,
  onLayout,
}: {
  isActive: boolean;
  icons: [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap];
  label: string;
  badge: number;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const { style, bounce } = useBounce();

  const handlePress = () => {
    bounce();
    // Tick only when actually switching tabs, not when re-tapping the active one.
    if (!isActive) haptics.select();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLayout={onLayout}
      className="items-center justify-center"
      style={{ minWidth: TAB_MIN_WIDTH, height: BAR_HEIGHT, paddingHorizontal: TAB_H_PADDING }}
      hitSlop={8}
    >
      <View>
        <Animated.View style={style}>
          <Ionicons
            name={isActive ? icons[1] : icons[0]}
            size={19}
            color={isActive ? "#800020" : "#999"}
          />
        </Animated.View>
        {badge > 0 && <TabBadge count={badge} />}
      </View>
      {/* Same font weight whether active or not: a weight change would change
          the text width, and the sliding pill is sized from the measured tab. */}
      <Text
        className={`text-[10px] mt-0.5 font-semibold ${
          isActive ? "text-primary" : "text-text opacity-50"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ScanFab({ onPress }: { onPress: () => void }) {
  const { style, bounce } = useBounce();

  const handlePress = () => {
    bounce();
    haptics.tap();
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
        style={[
          {
            flex: 1,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: "#800020",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 3,
            borderColor: Platform.OS === "ios" ? "#fff" : "transparent",
            ...fabShadow,
          },
          style,
        ]}
      >
        <Ionicons name="qr-code-outline" size={22} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabs({
  state,
  navigation,
  badges,
  bottomOffset,
}: Required<Pick<AppTabBarProps, "state" | "navigation">> &
  Pick<AppTabBarProps, "badges"> & { bottomOffset: number }) {
  // Measured position of every tab inside the bar, so the sliding pill can
  // glide to whichever tab becomes active.
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const placed = useRef(false);
  const indicatorX = useSharedValue(0);
  const indicatorW = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const activeKey = state.routes[state.index]?.key;

  const placeIndicator = (key: string | undefined) => {
    if (!key) return;
    const l = layouts.current[key];
    if (!l) return;

    if (!placed.current) {
      // First placement: jump straight there (no slide in from x = 0).
      indicatorX.value = l.x;
      indicatorW.value = l.width;
      indicatorOpacity.value = withTiming(1, { duration: 150 });
      placed.current = true;
    } else {
      indicatorX.value = withSpring(l.x, SLIDE_SPRING);
      indicatorW.value = withSpring(l.width, SLIDE_SPRING);
    }
  };

  useEffect(() => {
    placeIndicator(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorW.value,
    transform: [{ translateX: indicatorX.value }],
  }));

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

  const renderTab = (route: { key: string; name: string }) => (
    <TabButton
      key={route.key}
      isActive={route.key === activeKey}
      icons={ICONS[route.name] ?? ["ellipse-outline", "ellipse"]}
      label={LABELS[route.name] ?? route.name}
      badge={badges?.[route.name] ?? 0}
      onPress={() => navigateTo(route.name, route.key)}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        layouts.current[route.key] = { x, width };
        if (route.key === activeKey) placeIndicator(route.key);
      }}
    />
  );

  const mid = Math.ceil(visibleRoutes.length / 2);
  const leftRoutes = hasFab ? visibleRoutes.slice(0, mid) : visibleRoutes;
  const rightRoutes = hasFab ? visibleRoutes.slice(mid) : [];

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", bottom: bottomOffset, alignSelf: "center" }}
    >
      <View
        className="flex-row items-center bg-card"
        style={{
          height: BAR_HEIGHT,
          borderRadius: BAR_RADIUS,
          paddingHorizontal: BAR_H_PADDING,
          ...floatingShadow,
        }}
      >
        {/* First child so it paints underneath the tabs. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              top: INDICATOR_INSET,
              height: BAR_HEIGHT - INDICATOR_INSET * 2,
              borderRadius: BAR_RADIUS - 6,
              backgroundColor: "rgba(128, 0, 32, 0.10)",
            },
            indicatorStyle,
          ]}
        />

        {leftRoutes.map(renderTab)}
        {hasFab && <View style={{ width: FAB_SIZE + 16 }} />}
        {rightRoutes.map(renderTab)}
      </View>

      {hasFab && <ScanFab onPress={() => navigateTo(scanRoute!.name, scanRoute!.key)} />}
    </View>
  );
}

export default function AppTabBar({ state, navigation, badges }: AppTabBarProps) {
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

  // FloatingTabs unmounts while a hidden route is focused and mounts fresh
  // when the bar comes back, so the pill re-places itself without sliding
  // in from a stale position.
  return (
    <FloatingTabs
      state={state}
      navigation={navigation}
      badges={badges}
      bottomOffset={bottomOffset}
    />
  );
}