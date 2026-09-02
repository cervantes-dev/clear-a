import * as NavigationBar from "expo-navigation-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import "../global.css";
import { getCurrentUser } from "../services/auth";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Hide the Android system navigation bar on launch. On modern Android
  // (edge-to-edge enforced), the OS automatically handles temporary
  // swipe-to-reveal behavior itself once the bar is hidden - there's no
  // longer an app-controllable "behavior" setting (setBehaviorAsync is
  // deprecated and has no effect under edge-to-edge enforcement).
  // iOS has no equivalent API; the home indicator area can't be hidden by
  // apps at all on iOS.
  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("visible");
    }
  }, []);

  // Restore session on launch + subscribe to auth changes
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          setUser(null);
          return;
        }
        setLoading(true);
        const current = await getCurrentUser();
        setUser(current);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Redirect logic, runs whenever auth state or route segment changes
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace(user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } else if (user && segments[0] === "(staff)" && user.role !== "staff") {
      router.replace("/(student)/home");
    } else if (user && segments[0] === "(student)" && user.role === "staff") {
      router.replace("/(staff)/dashboard");
    }
  }, [isLoading, user, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#800020" />
      </View>
    );
  }

  return <Slot />;
}