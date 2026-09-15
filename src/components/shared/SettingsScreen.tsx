import { signOutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLE_LABELS: Record<string, string> = {
  staff: "Canteen Staff",
  student: "Student",
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const appVersion = Constants.expoConfig?.version ?? "—";

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOutUser();
            setUser(null);
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Couldn't log out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8 flex-row items-center" style={{ paddingTop: insets.top + 12 }}>
        <Pressable hitSlop={8} onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-lg font-bold">Settings</Text>
      </View>

      <View className="flex-1 bg-background rounded-t-3xl px-5" style={{ marginTop: -20, paddingTop: 24 }}>
        <Text className="text-text opacity-50 text-xs font-semibold uppercase mb-2 ml-1">Account</Text>
        <View className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">
          <View className="flex-row items-center px-4 py-3.5 border-b border-border">
            <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
              <Text className="text-primary font-bold text-sm">
                {user?.name?.trim()?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-semibold text-sm">{user?.name ?? "—"}</Text>
              <Text className="text-text opacity-50 text-xs mt-0.5">{user?.email ?? "—"}</Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="text-text opacity-70 text-sm">Role</Text>
            <Text className="text-text font-semibold text-sm">
              {user ? ROLE_LABELS[user.role] ?? user.role : "—"}
            </Text>
          </View>
        </View>

        <Text className="text-text opacity-50 text-xs font-semibold uppercase mb-2 ml-1">About</Text>
        <View className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="text-text opacity-70 text-sm">App version</Text>
            <Text className="text-text font-semibold text-sm">{appVersion}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          className="flex-row items-center justify-center bg-danger/10 rounded-2xl py-3.5"
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text className="text-danger font-bold text-sm ml-2">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}