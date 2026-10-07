import { Tabs, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppTabBar from "../../components/shared/AppTabBar";
import CanteenClosedBanner from "../../components/shared/CanteenClosedBanner";
import OrderReadyBanner from "../../components/student/orders/OrderReadyBanner";
import { useCanteenSync } from "../../hooks/useCanteenSync";
import { useFavoritesSync } from "../../hooks/useFavoritesSync";
import { useNotificationSync } from "../../hooks/useNotificationSync";
import { useStudentActiveOrderCount } from "../../hooks/useOrderBadgeCount";
import { useOrderReadyAlert } from "../../hooks/useOrderReadyAlert";
import { useCanteenStore } from "../../store/canteenStore";

// Matches AppTabBar: the floating bar is 54 tall and sits max(inset + 14, 24)
// above the bottom edge. The notice floats just above it.
const TAB_BAR_HEIGHT = 54;

export default function StudentLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];

  // Mounted once for the whole student tab group, so this per-user state
  // loads at login instead of depending on which screen opens first.
  useFavoritesSync();
  useNotificationSync();
  useCanteenSync();

  const activeOrders = useStudentActiveOrderCount();
  const { ready, dismiss } = useOrderReadyAlert();
  const canteenStatus = useCanteenStore((s) => s.status);

  const currentTab = segments[segments.length - 1];

  // Already looking at Orders: the card's status change and QR reveal say it
  // better than a banner on top of them.
  const onOrdersScreen = currentTab === "orders";
  useEffect(() => {
    if (ready && onOrdersScreen) dismiss();
  }, [ready, onOrdersScreen, dismiss]);

  // The closed notice floats on the browsing tabs only. The cart shows its own
  // in-page banner next to the disabled Place Order button, and Orders/Profile
  // aren't about ordering.
  const showClosedNotice =
    !!canteenStatus && !canteenStatus.isOpen && (currentTab === "home" || currentTab === "favorites");
  const noticeBottom = Math.max(insets.bottom + 14, 24) + TAB_BAR_HEIGHT + 10;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AppTabBar {...props} badges={{ orders: activeOrders }} />}
      >
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="orders" options={{ title: "Orders" }} />
        <Tabs.Screen name="favorites" options={{ title: "Favorites" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="cart" options={{ href: null }} />
        <Tabs.Screen name="menu" options={{ href: null }} />
      </Tabs>

      {showClosedNotice && canteenStatus && (
        <Animated.View
          pointerEvents="none"
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown.duration(180)}
          style={{ position: "absolute", left: 16, right: 16, bottom: noticeBottom }}
        >
          <CanteenClosedBanner status={canteenStatus} elevated />
        </Animated.View>
      )}

      {ready && !onOrdersScreen && (
        <OrderReadyBanner
          orderLabel={ready.orderLabel}
          token={ready.token}
          onPress={() => {
            dismiss();
            router.push("/(student)/orders");
          }}
          onDismiss={dismiss}
        />
      )}
    </View>
  );
}