import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BarChart from "../../components/charts/BarChart";
import DonutChart from "../../components/charts/DonutChart";
import LineChart from "../../components/charts/LineChart";
import OrderRow, { Order as OrderRowData } from "../../components/staff/dashboard/OrderRow";
import QuickActionCard, { QuickAction } from "../../components/staff/dashboard/QuickActionCard";
import StatCard, { Stat } from "../../components/staff/dashboard/StatCard";
import StaffHeaderAvatar from "../../components/staff/StaffHeaderAvatar";
import { useAllOrders } from "../../hooks/useAllOrders";
import { useAuthStore } from "../../store/authStore";
import { Order, OrderStatus } from "../../types/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};
const TAB_BAR_CLEARANCE = 64 + 40 + 24;

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toOrderRowData(order: Order): OrderRowData {
  return {
    orderId: order.id,
    id: order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : "#—",
    name: order.studentName ?? "Unknown student",
    time: formatTime(order.createdAt),
    status: STATUS_LABELS[order.status],
    price: `₱${order.total.toFixed(2)}`,
  };
}

function buildQuickActions(router: ReturnType<typeof useRouter>): QuickAction[] {
  return [
    {
      key: "menu",
      label: "Manage Menu",
      icon: "restaurant-outline",
      iconBg: "bg-primary/10",
      iconColor: "#800020",
      onPress: () => router.push("/(staff)/menu"),
    },
    {
      key: "inventory",
      label: "Inventory",
      icon: "cube-outline",
      iconBg: "bg-orange-100",
      iconColor: "#F59E0B",
      onPress: () => router.push("/(staff)/inventory" as any),
    },
    {
      key: "orders",
      label: "Orders",
      icon: "bag-handle-outline",
      iconBg: "bg-green-100",
      iconColor: "#16A34A",
      onPress: () => router.push("/(staff)/orders"),
    },
    {
      key: "reports",
      label: "Reports",
      icon: "bar-chart-outline",
      iconBg: "bg-purple-100",
      iconColor: "#7C3AED",
      onPress: () => { },
    },
  ];
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { orders, loading, refreshing, error, refresh } = useAllOrders();

  const today = todayDateString();
  const quickActions = buildQuickActions(router);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toISOString().split("T")[0],
        label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
      };
    });
  }, []);

  const { stats, recentOrders, revenueData, ordersData, statusData } = useMemo(() => {
    const todayOrders = orders.filter((o) => o.orderDate === today);
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const completedToday = todayOrders.filter((o) => o.status === "completed");
    const revenueToday = completedToday.reduce((sum, o) => sum + o.total, 0);

    const stats: Stat[] = [
      {
        key: "today",
        label: "Today's Orders",
        value: String(todayOrders.length),
        note: "So far today",
        noteColor: "text-gray-400",
        icon: "bag-handle-outline",
        iconBg: "bg-primary/10",
        iconColor: "#800020",
      },
      {
        key: "pending",
        label: "Pending Orders",
        value: String(pendingCount),
        note: "Needs preparation",
        noteColor: "text-orange-500",
        icon: "time-outline",
        iconBg: "bg-orange-100",
        iconColor: "#F59E0B",
      },
      {
        key: "completed",
        label: "Completed Orders",
        value: String(completedToday.length),
        note: "Picked up today",
        noteColor: "text-green-600",
        icon: "checkmark",
        iconBg: "bg-green-100",
        iconColor: "#16A34A",
      },
      {
        key: "revenue",
        label: "Today's Revenue",
        value: `₱${revenueToday.toFixed(2)}`,
        note: "From completed orders",
        noteColor: "text-gray-400",
        icon: null,
        iconBg: "bg-purple-100",
        iconColor: "#7C3AED",
      },
    ];

    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(toOrderRowData);

    const revenueData = last7Days.map(({ dateStr, label }) => ({
      label,
      value: orders
        .filter((o) => o.orderDate === dateStr && o.status === "completed")
        .reduce((sum, o) => sum + o.total, 0),
    }));

    const ordersData = last7Days.map(({ dateStr, label }) => ({
      label,
      value: orders.filter((o) => o.orderDate === dateStr).length,
    }));

    const statusData = [
      { label: "Pending", value: todayOrders.filter((o) => o.status === "pending").length, color: "#F59E0B" },
      { label: "Preparing", value: todayOrders.filter((o) => o.status === "preparing").length, color: "#3B82F6" },
      { label: "Ready", value: todayOrders.filter((o) => o.status === "ready").length, color: "#16A34A" },
      { label: "Completed", value: todayOrders.filter((o) => o.status === "completed").length, color: "#6B7280" },
    ];

    return { stats, recentOrders, revenueData, ordersData, statusData };
  }, [orders, today, last7Days]);

  const todayLabel = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as Orders */}
      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-white text-lg font-bold">Dashboard</Text>
          <View className="flex-row items-center">
            <Pressable hitSlop={8} style={{ position: "relative", marginRight: 14 }}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: "#EF4444",
                  borderRadius: 8,
                  minWidth: 16,
                  height: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>3</Text>
              </View>
            </Pressable>
            <StaffHeaderAvatar />
          </View>
        </View>

        <View className="flex-row items-center">
          <Image
            source={require("../../../assets/images/staff-avatar.png")}
            style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: "#fff" }}
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-white text-lg font-bold">
              Good morning, {user?.name ?? "Staff"}! 👋
            </Text>
            <Text className="text-white opacity-80 text-sm mt-0.5">
              Here's what's happening{"\n"}in the canteen today.
            </Text>
          </View>
        </View>
      </View>

      {/* Rounded-top sheet, same reveal pattern as Orders */}
      <ScrollView
        className="flex-1 bg-background rounded-t-3xl"
        style={{ marginTop: -20 }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View className="px-5">
          {/* Overview */}
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text text-lg font-bold">Overview</Text>
            <View className="flex-row items-center">
              <Text className="text-primary font-semibold text-sm mr-1">Today, {todayLabel}</Text>
              <Ionicons name="calendar-outline" size={16} color="#800020" />
            </View>
          </View>

          {loading ? (
            <Text className="text-gray-400 text-center py-6">Loading...</Text>
          ) : error ? (
            <Text className="text-gray-500 text-center py-6">{error}</Text>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {stats.map((stat) => (
                <StatCard key={stat.key} stat={stat} />
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <Text className="text-text text-lg font-bold mb-3">Quick Actions</Text>
          <View className="flex-row justify-between">
            {quickActions.map((action) => (
              <QuickActionCard key={action.key} action={action} />
            ))}
          </View>

          {/* Analytics */}
          {!loading && !error && (
            <>
              <Text className="text-text text-lg font-bold mb-3 mt-2">Analytics</Text>

              <View className="bg-card border border-border rounded-2xl px-4 py-4 mb-4">
                <Text className="text-text font-semibold text-sm mb-1">Revenue — Last 7 Days</Text>
                <LineChart data={revenueData} />
              </View>

              <View className="bg-card border border-border rounded-2xl px-4 py-4 mb-4">
                <Text className="text-text font-semibold text-sm mb-1">Orders — Last 7 Days</Text>
                <BarChart data={ordersData} />
              </View>

              <View className="bg-card border border-border rounded-2xl px-4 py-4 mb-6">
                <Text className="text-text font-semibold text-sm mb-3">Today's Order Status</Text>
                <DonutChart data={statusData} />
              </View>
            </>
          )}

          {/* Recent Orders */}
          <View className="flex-row items-center justify-between mb-3 mt-2">
            <Text className="text-text text-lg font-bold">Recent Orders</Text>
            <Pressable className="flex-row items-center" onPress={() => router.push("/(staff)/orders")}>
              <Text className="text-primary font-semibold text-sm mr-1">View all</Text>
              <Ionicons name="chevron-forward" size={14} color="#800020" />
            </Pressable>
          </View>

          {!loading && !error && recentOrders.length === 0 ? (
            <Text className="text-gray-400 text-center py-6">No orders yet today.</Text>
          ) : (
            <View className="bg-card border border-border rounded-2xl px-4 mb-6">
              {recentOrders.map((order, i) => (
                <OrderRow key={order.orderId} order={order} isLast={i === recentOrders.length - 1} />
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}