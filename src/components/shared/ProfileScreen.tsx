import PrimaryButton from "@/components/ui/PrimaryButton";
import { signOutUser } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = async () => {
    await signOutUser();
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <View className="bg-primary pt-12 pb-6 px-5">
        <Text className="text-white text-lg font-bold">Profile</Text>
      </View>

      <View className="flex-1 px-5 pt-6">
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Text className="text-primary text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="text-text text-lg font-bold">{user?.name ?? "Unknown"}</Text>
          <Text className="text-text opacity-50 text-sm mt-0.5">{user?.email}</Text>
          {user?.role && (
            <View className="bg-primary/10 rounded-full px-3 py-1 mt-2">
              <Text className="text-primary text-xs font-semibold capitalize">{user.role}</Text>
            </View>
          )}
        </View>

        <PrimaryButton label="Sign Out" onPress={handleSignOut} variant="outline" />

        <Text className="text-text opacity-30 text-xs text-center mt-6">
          Temporary profile screen - full version coming later
        </Text>
      </View>
    </SafeAreaView>
  );
}