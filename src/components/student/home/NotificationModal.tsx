import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationItem } from "../../../types/notification";
import NotificationRow from "./NotificationRow";

type Props = {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onDelete: (id: string) => void;
};

// Floor in case insets.bottom under-reports on some devices/emulators (the
// same reason AppTabBar has a minimum offset) -- guarantees the sheet's
// content never sits flush against the system navigation bar.
const MIN_BOTTOM_INSET = 16;

export default function NotificationModal({ visible, notifications, onClose, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, MIN_BOTTOM_INSET);

  return (
    // The two translucent flags make the Modal window draw edge-to-edge under
    // the status bar and the system navigation bar (Android only; ignored on
    // iOS), so the dimmed backdrop covers the whole screen and the sheet's
    // bottom padding below is what keeps its content clear of the bar.
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/*
        react-native's Modal renders its content in a separate native root,
        outside the app's own GestureHandlerRootView -- react-native-gesture-
        handler (which Swipeable in NotificationRow depends on) needs its own
        root here or its gestures silently never fire inside this Modal.
      */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={onClose}>
          <Pressable
            className="bg-card rounded-t-3xl overflow-hidden"
            style={{ maxHeight: "70%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1.5 rounded-full bg-border" />
            </View>

            <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-border">
              <Text className="text-lg font-bold text-text">Notifications</Text>
              <Pressable hitSlop={8} onPress={onClose}>
                <Ionicons name="close" size={22} color="#666" />
              </Pressable>
            </View>

            {notifications.length === 0 ? (
              <View className="items-center pt-10 px-8" style={{ paddingBottom: bottomInset + 24 }}>
                <Ionicons name="notifications-outline" size={40} color="#D1D5DB" />
                <Text className="text-text opacity-50 text-sm text-center mt-3">
                  No notifications yet. We'll let you know when there's an update on your orders.
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={{ paddingBottom: bottomInset + 12 }}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((n, i) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    isLast={i === notifications.length - 1}
                    onDelete={onDelete}
                  />
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}