import AppTabBar from "@/components/shared/AppTabBar";
import { useCanteenSync } from "@/hooks/useCanteenSync";
import { useStaffPendingOrderCount } from "@/hooks/useOrderBadgeCount";
import { Tabs } from "expo-router";

export default function StaffLayout() {
  // Keeps the canteen's open/closed status live for the "Close for today" control.
  useCanteenSync();

  const pendingOrders = useStaffPendingOrderCount();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} badges={{ orders: pendingOrders }} />}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="menu" options={{ title: "Menu" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="scan" options={{ href: null }} />
    </Tabs>
  );
}