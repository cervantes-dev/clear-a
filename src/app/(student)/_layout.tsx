import { Tabs } from "expo-router";
import AppTabBar from "../../components/shared/AppTabBar";
import { useFavoritesSync } from "../../hooks/useFavoritesSync";
import { useNotificationSync } from "../../hooks/useNotificationSync";

export default function StudentLayout() {
  // Mounted once for the whole student tab group, so this per-user state
  // loads at login instead of depending on which screen opens first.
  useFavoritesSync();
  useNotificationSync();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="favorites" options={{ title: "Favorites" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
      <Tabs.Screen name="menu" options={{ href: null }} />
    </Tabs>
  );
}