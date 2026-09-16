import { Ionicons } from "@expo/vector-icons";

export type NotificationItem = {
  id: string; // unique per event, e.g. `${orderId}-ready`
  orderId: string;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  timestamp: string; // ISO
};