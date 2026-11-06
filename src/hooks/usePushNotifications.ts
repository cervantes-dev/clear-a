import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { registerForPush } from "../services/push";
import { useAuthStore } from "../store/authStore";

export function usePushNotifications() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  // Also covers cold start: the tap that launched the app.
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!userId) return;
    registerForPush().catch((e) => console.error("Push registration failed:", e));
  }, [userId]);

  useEffect(() => {
    if (!lastResponse || !userId) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const screen = lastResponse.notification.request.content.data?.screen;
    if (typeof screen === "string") router.push(screen as any);
  }, [lastResponse, userId]);
}