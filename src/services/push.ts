import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// In the foreground the app already has live in-app updates (banner, badges,
// realtime lists), so don't also pop a system banner on top of them.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let currentToken: string | null = null;

export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return; // simulators can't receive push

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#800020",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Push: missing EAS projectId -- run `eas init`.");
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  currentToken = token;

  const { error } = await supabase.rpc("register_push_token", {
    p_token: token,
    p_platform: Platform.OS,
  });
  if (error) throw error;
}

/** Call BEFORE signing out -- the RPC needs the user's session. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await supabase.rpc("unregister_push_token", { p_token: currentToken });
  } catch {
    // best effort -- a stale token is pruned by the edge function later
  }
  currentToken = null;
}