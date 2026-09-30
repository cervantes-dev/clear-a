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
  const { user, isLoading, suppressRedirect, setUser } = useAuthStore();
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

    // IMPORTANT: this callback must NOT be async and must NOT await any
    // Supabase call directly. supabase-js holds an internal lock while
    // running auth callbacks, so awaiting another Supabase request in here
    // can deadlock the client -- every later query (cart, orders, menu)
    // then hangs until it times out. Deferring the work with setTimeout
    // lets the callback return and release the lock first.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null);
        return;
      }

      // Launch is already covered by getCurrentUser() above, and a token
      // refresh doesn't change the profile -- refetching on either is
      // wasted work through the exact path we're trying to keep clear.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;

      // Deliberately NOT calling setLoading(true) here. This fires on
      // every session change, including the one caused by a screen's own
      // sign-in flow (which may be mid-way through its own success
      // animation) -- flipping the global isLoading flag would unmount
      // the whole app tree into the boot spinner below and cut that
      // animation off. setUser() already resolves isLoading to false, so
      // this stays a silent background refresh.
      setTimeout(() => {
        getCurrentUser()
          .then(setUser)
          .catch(() => setUser(null));
      }, 0);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Redirect logic, runs whenever auth state or route segment changes
  useEffect(() => {
    if (isLoading || suppressRedirect) return;

    // Still sitting on the bare "/" route (index.tsx hasn't redirected yet).
    // index.tsx makes its own onboarding-vs-login decision asynchronously
    // (it has to read AsyncStorage first) -- if this effect also redirects
    // during that window, the two navigations race and whichever fires last
    // wins, which was silently overriding the onboarding redirect with
    // this effect's own "no user -> login" rule. Waiting for segments to be
    // non-empty means index.tsx's redirect has already happened, so this
    // effect is only ever reacting to a route that's already resolved.
    // Cast to string[] first -- expo-router's typed-routes union for
    // useSegments() doesn't include the zero-length case even though it's
    // the real runtime value on the bare index route.
    const currentSegments = segments as string[];
    if (currentSegments.length === 0) return;

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
  }, [isLoading, suppressRedirect, user, segments]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <Slot />;
}