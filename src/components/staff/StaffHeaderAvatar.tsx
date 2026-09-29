import LogoutConfirmModal from "@/components/shared/LogoutConfirmModal";
import { signOutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StaffHeaderAvatar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // iOS drops a modal presented while another is still dismissing, so on iOS
  // we wait for the menu's onDismiss before opening the confirm modal.
  const openConfirmAfterMenuRef = useRef(false);

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  const handleSettings = () => {
    setMenuOpen(false);
    router.push("/(staff)/settings");
  };

  const handleLogoutPress = () => {
    setMenuOpen(false);
    if (Platform.OS === "ios") {
      openConfirmAfterMenuRef.current = true;
    } else {
      setConfirmOpen(true);
    }
  };

  const handleMenuDismiss = () => {
    if (openConfirmAfterMenuRef.current) {
      openConfirmAfterMenuRef.current = false;
      setConfirmOpen(true);
    }
  };

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await signOutUser();
      setUser(null);
      // Root layout's redirect effect handles navigation to /(auth)/login
      // once the auth store's user becomes null -- no manual router
      // call needed here.
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't log out. Please try again.");
    } finally {
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Pressable
        hitSlop={8}
        onPress={() => setMenuOpen(true)}
        className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
      >
        <Text className="text-white font-bold text-sm">{initial}</Text>
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
        onDismiss={handleMenuDismiss}
      >
        <Pressable className="flex-1" onPress={() => setMenuOpen(false)}>
          <View
            className="absolute right-5 bg-card rounded-2xl overflow-hidden"
            style={{
              top: insets.top + 56,
              width: 180,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {user ? (
              <View className="px-4 py-3 border-b border-border">
                <Text className="text-text font-semibold text-sm" numberOfLines={1}>
                  {user.name}
                </Text>
                <Text className="text-text opacity-50 text-xs mt-0.5" numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSettings}
              className="flex-row items-center px-4 py-3 active:bg-background"
            >
              <Ionicons name="settings-outline" size={18} color="#333" />
              <Text className="text-text text-sm ml-3">Settings</Text>
            </Pressable>

            <Pressable
              onPress={handleLogoutPress}
              className="flex-row items-center px-4 py-3 active:bg-background"
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text className="text-danger text-sm ml-3">Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <LogoutConfirmModal
        visible={confirmOpen}
        loading={loggingOut}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}