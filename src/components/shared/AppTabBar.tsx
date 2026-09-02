import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, Text, View } from "react-native";
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
  orders: "bag-outline",
  menu: "restaurant-outline",
  inventory: "cube-outline",
  profile: "person-outline",
};

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  home: "Home",
  orders: "Orders",
  menu: "Menu",
  inventory: "Inventory",
  profile: "Profile",
};

const FAB_SIZE = 56;
const BAR_HEIGHT = 64;
const BAR_RADIUS = 24;
const BAR_MARGIN_H = 16;

// Extra breathing room above the system nav bar / home indicator so the
// floating bar reads as clearly detached from it, not flush against it.
const BOTTOM_GAP = 28;
// Floor in case insets.bottom under-reports on some devices/emulators
// (e.g. translucent nav bar configs that don't always push a nonzero
// inset) - guarantees the bar never sits flush against the nav bar.
const MIN_BOTTOM_OFFSET = 40;

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

export default function AppTabBar({ state, navigation }: AppTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + BOTTOM_GAP, MIN_BOTTOM_OFFSET);

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
      <Pressable
        key={route.key}
        onPress={() => navigateTo(route.name, route.key)}
        className="items-center justify-center flex-1"
        hitSlop={8}
      >
        <Ionicons name={icon} size={21} color={isActive ? "#800020" : "#999"} />
        <Text
          className={`text-[11px] mt-0.5 ${
            isActive ? "text-primary font-bold" : "text-text opacity-50"
          }`}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  if (!hasFab) {
    return (
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", left: BAR_MARGIN_H, right: BAR_MARGIN_H, bottom: bottomOffset }}
      >
        <View
          className="flex-row items-center bg-card"
          style={{ height: BAR_HEIGHT, borderRadius: BAR_RADIUS, paddingHorizontal: 8, ...floatingShadow }}
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
      style={{ position: "absolute", left: BAR_MARGIN_H, right: BAR_MARGIN_H, bottom: bottomOffset }}
    >
      <View
        className="flex-row items-center bg-card"
        style={{ height: BAR_HEIGHT, borderRadius: BAR_RADIUS, paddingHorizontal: 8, ...floatingShadow }}
      >
        <View className="flex-row flex-1">{leftRoutes.map(renderTab)}</View>
        <View style={{ width: FAB_SIZE + 8 }} />
        <View className="flex-row flex-1">{rightRoutes.map(renderTab)}</View>
      </View>

      <Pressable
        onPress={() => navigateTo(scanRoute!.name, scanRoute!.key)}
        style={{
          position: "absolute",
         top: -(FAB_SIZE / 2) + 12,
          left: "50%",
          marginLeft: -FAB_SIZE / 2,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: "#800020",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: Platform.OS === "ios" ? "#fff" : "transparent",
          ...fabShadow,
        }}
      >
        <Ionicons name="qr-code-outline" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}