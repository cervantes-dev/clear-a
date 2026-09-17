import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BarChart from "../../components/charts/BarChart";
import DonutChart from "../../components/charts/DonutChart";
import LineChart from "../../components/charts/LineChart";
import DashboardSkeleton from "../../components/staff/dashboard/DashboardSkeleton";
import OrderRow, { Order as OrderRowData } from "../../components/staff/dashboard/OrderRow";
import StaffNotificationSheet from "../../components/staff/dashboard/StaffNotificationSheet";
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

type ChartKey = "revenue" | "orders" | "status";

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

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { orders, loading, refreshing, error, refresh } = useAllOrders();

  const [activeChart, setActiveChart] = useState<ChartKey>("revenue");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [readOrderIds, setReadOrderIds] = useState<Set<string>>(new Set());

  const today = todayDateString();

  // Stamp the first successful load, and again after every pull-to-refresh.
  useEffect(() => {
    if (!loading) setLastUpdated(new Date());
  }, [loading]);

  const handleRefresh = async () => {
    await refresh();
    setLastUpdated(new Date());
  };

  const goToOrders = () => router.push("/(staff)/orders");

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

  const { stats, recentOrders, revenueData, ordersData, statusData, pendingOrders } = useMemo(() => {
    const todayOrders = orders.filter((o) => o.orderDate === today);
    const pendingOrders = orders
      .filter((o) => o.status === "pending")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const pendingCount = pendingOrders.length;
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
        onPress: goToOrders,
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
        onPress: goToOrders,
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
        onPress: goToOrders,
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

    return { stats, recentOrders, revenueData, ordersData, statusData, pendingOrders };
  }, [orders, today, last7Days]);

  const unreadCount = pendingOrders.filter((o) => !readOrderIds.has(o.id)).length;

  const openNotifications = () => {
    setNotificationsVisible(true);
    setReadOrderIds((prev) => {
      const next = new Set(prev);
      pendingOrders.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const handleSelectNotification = () => {
    setNotificationsVisible(false);
    goToOrders();
  };

  const todayLabel = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const CHART_TABS: { key: ChartKey; label: string }[] = [
    { key: "revenue", label: "Revenue" },
    { key: "orders", label: "Orders" },
    { key: "status", label: "Status" },
  ];

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-lg font-bold">Dashboard</Text>
          <View className="flex-row items-center">
            <Pressable
              hitSlop={8}
              onPress={openNotifications}
              style={{ position: "relative", marginRight: 14 }}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {unreadCount > 0 && (
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
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <StaffHeaderAvatar />
          </View>
        </View>

        <Text className="text-white text-xl font-bold">
          Good morning, {user?.name ?? "Staff"}! 👋
        </Text>
        <Text className="text-white/80 text-sm mt-1">Here's today's overview</Text>
      </View>

      <ScrollView
        className="flex-1 bg-background rounded-t-3xl"
        style={{ marginTop: -20 }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <Text className="text-gray-500 text-center py-10">{error}</Text>
        ) : (
          <View className="px-5">
            {pendingOrders.length > 0 && (
              <Pressable
                onPress={goToOrders}
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                className="flex-row items-center bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5 mb-4"
              >
                <View className="w-9 h-9 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                </View>
                <View className="flex-1">
                  <Text className="text-text font-semibold text-sm">
                    {pendingOrders.length} order{pendingOrders.length !== 1 ? "s" : ""} waiting
                  </Text>
                  <Text className="text-text opacity-50 text-xs mt-0.5">
                    Tap to review and start preparing
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D97706" />
              </Pressable>
            )}

            {/* Overview */}
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-text text-lg font-bold">Overview</Text>
              <View className="flex-row items-center">
                <Text className="text-primary font-semibold text-sm mr-1">Today, {todayLabel}</Text>
                <Ionicons name="calendar-outline" size={16} color="#800020" />
              </View>
            </View>
            {updatedLabel && (
              <Text className="text-text opacity-40 text-xs mb-3">Updated {updatedLabel}</Text>
            )}

            <View className="flex-row flex-wrap justify-between">
              {stats.map((stat) => (
                <StatCard key={stat.key} stat={stat} />
              ))}
            </View>

            {/* Analytics */}
            <Text className="text-text text-lg font-bold mb-3 mt-2">Analytics</Text>

            <View className="flex-row bg-gray-100 rounded-full p-1 mb-4">
              {CHART_TABS.map((tab) => {
                const active = activeChart === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveChart(tab.key)}
                    className={`flex-1 items-center py-2.5 rounded-full ${active ? "bg-primary" : ""}`}
                  >
                    <Text className={`text-xs font-bold ${active ? "text-white" : "text-text opacity-50"}`}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="bg-card border border-border rounded-2xl px-4 py-4 mb-6">
              {activeChart === "revenue" && (
                <>
                  <Text className="text-text font-semibold text-sm mb-1">Revenue — Last 7 Days</Text>
                  <LineChart data={revenueData} />
                </>
              )}
              {activeChart === "orders" && (
                <>
                  <Text className="text-text font-semibold text-sm mb-1">Orders — Last 7 Days</Text>
                  <BarChart data={ordersData} />
                </>
              )}
              {activeChart === "status" && (
                <>
                  <Text className="text-text font-semibold text-sm mb-3">Today's Order Status</Text>
                  <DonutChart data={statusData} />
                </>
              )}
            </View>

            {/* Recent Orders */}
            <View className="flex-row items-center justify-between mb-3 mt-2">
              <Text className="text-text text-lg font-bold">Recent Orders</Text>
              <Pressable className="flex-row items-center" onPress={goToOrders}>
                <Text className="text-primary font-semibold text-sm mr-1">View all</Text>
                <Ionicons name="chevron-forward" size={14} color="#800020" />
              </Pressable>
            </View>

            {recentOrders.length === 0 ? (
              <Text className="text-gray-400 text-center py-6">No orders yet today.</Text>
            ) : (
              <View className="bg-card border border-border rounded-2xl px-4 mb-6">
                {recentOrders.map((order, i) => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    isLast={i === recentOrders.length - 1}
                    onPress={goToOrders}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <StaffNotificationSheet
        visible={notificationsVisible}
        orders={pendingOrders}
        onClose={() => setNotificationsVisible(false)}
        onSelect={handleSelectNotification}
      />
    </View>
  );
}