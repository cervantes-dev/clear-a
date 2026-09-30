import { Tabs } from "expo-router";
import AppTabBar from "../../components/shared/AppTabBar";
import { useFavoritesSync } from "../../hooks/useFavoritesSync";

export default function StudentLayout() {
  // Mounted once for the whole student tab group, so favorites load at
  // login instead of depending on which screen the student opens first.
  useFavoritesSync();

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