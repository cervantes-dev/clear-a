import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SloganCard from "../../components/student/home/SloganCard";
import TodaySpecialCard from "../../components/student/home/TodaySpecialCard";
import TodaySpecialSkeleton from "../../components/student/skeleton/TodaySpecialSkeleton";
import { useStudentMenu } from "../../hooks/useStudentMenu";
import { useAuthStore } from "../../store/authStore";

function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (first.length === 0) return "";
  return first[0].toUpperCase() + first.slice(1).toLowerCase();
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const { menuItems, loading, refreshing, error, refresh } = useStudentMenu();

  const specials = menuItems.filter((i) => i.isSpecial && i.available);
  const firstName = user ? getFirstName(user.name) : "";

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View>
            <Text className="text-text opacity-50 text-sm">{getGreeting()},</Text>
            <Text className="text-text text-2xl font-bold">{firstName || "there"} 👋</Text>
          </View>

          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-card border border-border items-center justify-center"
            onPress={() => {}}
          >
            <Ionicons name="notifications-outline" size={22} color="#800020" />
            {/* Notification dot — decorative until real unread state exists */}
            <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-danger" />
          </TouchableOpacity>
        </View>

        <SloganCard />

        <View className="mt-6">
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-lg font-bold text-text">Today's Specials</Text>
            <TouchableOpacity onPress={() => router.push("/(student)/menu")}>
              <Text className="text-primary text-sm font-semibold">See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <TodaySpecialSkeleton />
          ) : error ? (
            <Text className="text-text opacity-60 text-center px-5">{error}</Text>
          ) : specials.length === 0 ? (
            <Text className="text-text opacity-50 text-center px-5">No specials today. Check back soon!</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {specials.map((item) => (
                <TodaySpecialCard key={item.id} item={item} />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mt-6 px-5">
          <Text className="text-lg font-bold text-text mb-3">Quick Actions</Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/(student)/menu")}
            >
              <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mb-2">
                <Ionicons name="restaurant-outline" size={22} color="#800020" />
              </View>
              <Text className="text-sm font-semibold text-text">Browse Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-card rounded-2xl border border-border p-4 items-center"
              onPress={() => router.push("/(student)/orders")}
            >
              <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center mb-2">
                <Ionicons name="receipt-outline" size={22} color="#800020" />
              </View>
              <Text className="text-sm font-semibold text-text">My Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}