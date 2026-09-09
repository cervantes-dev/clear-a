import * as NavigationBar from "expo-navigation-bar";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import LoadingScreen from "../components/shared/LoadingScreen";
import "../global.css";
import { getCurrentUser } from "../services/auth";
import { supabase } from "../services/supabase";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("visible");
    }
  }, []);

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

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inCompleteProfile = segments[0] === "complete-profile";
    // A Google sign-in creates a profile with no lrn -- gate them on
    // complete-profile until they provide one.
    const needsLrn = !!user && user.role === "student" && !user.lrn;

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (needsLrn && !inCompleteProfile) {
      router.replace("/complete-profile");
    } else if (user && !needsLrn && (inAuthGroup || inCompleteProfile)) {
      router.replace(user.role === "staff" ? "/(staff)/dashboard" : "/(student)/home");
    } else if (user && segments[0] === "(staff)" && user.role !== "staff") {
      router.replace("/(student)/home");
    } else if (user && segments[0] === "(student)" && user.role === "staff") {
      router.replace("/(staff)/dashboard");
    }
  }, [isLoading, user, segments]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <Slot />;
}