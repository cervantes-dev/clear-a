import ChangePasswordModal from "@/components/shared/ChangePasswordModal";
import EditNameModal from "@/components/shared/EditNameModal";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { changePassword, signOutUser, updateProfileName } from "@/services/auth";
import { useAuthStore } from "@/store/authStore";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROLE_LABELS: Record<string, string> = {
  staff: "Canteen Staff",
  student: "Student",
};

const ROLE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  staff: "briefcase-outline",
  student: "school-outline",
};

function formatMemberSince(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const isStaff = user?.role === "staff";

  const [editVisible, setEditVisible] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? "—";

  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const entranceStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
      },
    ],
  };

  const handleSaveName = async (name: string) => {
    if (!user) return;
    setSavingName(true);
    try {
      await updateProfileName(name);
      setUser({ ...user, name });
      setEditVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't update your name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setPasswordVisible(false);
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't update your password.");
    } finally {
      setSavingPassword(false);
    }
  };

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

  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-white text-2xl font-bold">{isStaff ? "Settings" : "Profile"}</Text>
        <Text className="text-white/80 text-sm mt-1">
          {isStaff ? "Manage your account" : "Your account"}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-background rounded-t-3xl"
        style={{ marginTop: -20 }}
        contentContainerStyle={{
          paddingTop: 24,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        <Animated.View style={entranceStyle}>
          {/* Identity card */}
          <View
            className="bg-card border border-border rounded-2xl items-center py-6 mb-6 overflow-hidden"
            style={{ position: "relative" }}
          >
            <View
              style={{
                position: "absolute",
                top: -50,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: "#800020",
                opacity: 0.05,
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: -40,
                left: -50,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: "#800020",
                opacity: 0.05,
              }}
            />

            <View style={{ position: "relative" }} className="mb-3">
              <View className="w-24 h-24 rounded-full border-2 border-primary/20 items-center justify-center">
                <View className="w-[76px] h-[76px] rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-primary text-3xl font-bold">
                    {user?.name?.trim()?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setEditVisible(true)}
                hitSlop={6}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary items-center justify-center"
                style={{ borderWidth: 2, borderColor: "#F5F5F7" }}
              >
                <Ionicons name="pencil" size={12} color="#fff" />
              </Pressable>
            </View>

            <Text className="text-text text-lg font-bold">{user?.name ?? "Unknown"}</Text>
            <Text className="text-text opacity-50 text-sm mt-0.5">{user?.email ?? "—"}</Text>

            {user?.role && (
              <View className="flex-row items-center bg-primary/10 rounded-full px-3 py-1.5 mt-3">
                <Ionicons name={ROLE_ICONS[user.role] ?? "person-outline"} size={13} color="#800020" />
                <Text className="text-primary text-xs font-bold ml-1.5">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Text>
              </View>
            )}

            {memberSince && (
              <Text className="text-text opacity-40 text-xs mt-2">Member since {memberSince}</Text>
            )}
          </View>

          {!isStaff && (
            <View className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
              <View className="flex-row items-center px-4 py-3.5 bg-primary/5">
                <Ionicons name="person-outline" size={18} color="#800020" />
                <Text className="text-text font-bold text-sm ml-2">Student Details</Text>
              </View>
              <View className="p-3">
                <View className="flex-row items-center justify-between bg-primary/5 rounded-xl px-4 py-3">
                  <View className="flex-row items-center">
                    <Ionicons name="card-outline" size={16} color="#800020" />
                    <Text className="text-text opacity-50 text-sm ml-2">LRN</Text>
                  </View>
                  <Text className="text-text font-bold text-sm">{user?.lrn ?? "Not set"}</Text>
                </View>
              </View>
            </View>
          )}

          <View className="flex-row items-center mb-2 ml-1">
            <Ionicons name="shield-checkmark-outline" size={16} color="#2B2B2B" />
            <Text className="text-text font-bold text-sm ml-2">Account & Security</Text>
          </View>
          <View className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">
            <Pressable
              onPress={() => setPasswordVisible(true)}
              className="flex-row items-center justify-between px-4 py-3.5 active:bg-background"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="lock-closed-outline" size={18} color="#800020" />
                <View className="ml-3">
                  <Text className="text-text font-semibold text-sm">Change Password</Text>
                  <Text className="text-text opacity-50 text-xs mt-0.5">Update your login password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center bg-danger/10 rounded-2xl py-3.5 mb-5"
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text className="text-danger font-bold text-sm ml-2">Log out</Text>
          </Pressable>

          <Text className="text-text opacity-30 text-xs text-center">CLEAR-A v{appVersion}</Text>
        </Animated.View>
      </ScrollView>

      <EditNameModal
        visible={editVisible}
        currentName={user?.name ?? ""}
        saving={savingName}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveName}
      />

      <ChangePasswordModal
        visible={passwordVisible}
        saving={savingPassword}
        onClose={() => setPasswordVisible(false)}
        onSave={handleChangePassword}
      />
    </View>
  );
}