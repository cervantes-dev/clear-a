import { signOutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StaffHeaderAvatar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  const handleSettings = () => {
    setMenuOpen(false);
    router.push("/(staff)/settings");
  };

  const handleLogout = () => {
    setMenuOpen(false);
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutUser();
            setUser(null);
            // Root layout's redirect effect handles navigation to /(auth)/login
            // once the auth store's user becomes null -- no manual router
            // call needed here.
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Couldn't log out. Please try again.");
          }
        },
      },
    ]);
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

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
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
              onPress={handleLogout}
              className="flex-row items-center px-4 py-3 active:bg-background"
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text className="text-danger text-sm ml-3">Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}