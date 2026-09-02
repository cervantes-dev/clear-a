import OrderStatPill from "@/components/staff/orders/OrderStatPill";
import StaffOrderCard from "@/components/staff/orders/StaffOrderCard";
import { useAllOrders } from "@/hooks/useAllOrders";
import { OrderStatus } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterKey = "pending" | "preparing" | "ready" | "history";

export default function StaffOrdersScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { orders, loading, refreshing, error, refresh } = useAllOrders();
    const [filter, setFilter] = useState<FilterKey>("pending");

    const counts = useMemo(() => {
        const byStatus = (status: OrderStatus) => orders.filter((o) => o.status === status).length;
        return {
            pending: byStatus("pending"),
            preparing: byStatus("preparing"),
            ready: byStatus("ready"),
            history: byStatus("completed") + byStatus("cancelled"),
        };
    }, [orders]);

    const filtered = useMemo(() => {
        switch (filter) {
            case "pending":
                return orders.filter((o) => o.status === "pending");
            case "preparing":
                return orders.filter((o) => o.status === "preparing");
            case "ready":
                return orders.filter((o) => o.status === "ready");
            case "history":
                return orders.filter((o) => o.status === "completed" || o.status === "cancelled");
        }
    }, [orders, filter]);

    const FILTERS: { key: FilterKey; label: string; count: number }[] = [
        { key: "pending", label: "Pending", count: counts.pending },
        { key: "preparing", label: "Preparing", count: counts.preparing },
        { key: "ready", label: "Ready", count: counts.ready },
        { key: "history", label: "History", count: counts.history },
    ];

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar style="light" />

            {/* Plain rectangular header -- no rounded corners here */}
            <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 16 }}>
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-white text-2xl font-bold">Orders</Text>
                        <Text className="text-white/80 text-sm mt-1">Manage and update orders</Text>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => router.push("/(staff)/scan")}
                            className="flex-row items-center bg-white/15 rounded-full px-3 py-2 mr-2"
                        >
                            <Ionicons name="qr-code-outline" size={18} color="#fff" />
                            <Text className="text-white text-xs font-bold ml-1.5">Scan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="w-10 h-10 items-center justify-center relative" hitSlop={8}>
                            <Ionicons name="notifications-outline" size={22} color="#fff" />
                            <View className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger items-center justify-center">
                                <Text className="text-white text-[9px] font-bold">3</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View
                className="flex-1 bg-gray-50 rounded-t-3xl"
                style={{ marginTop: -20, paddingTop: 20 }}
            >
                <View className="flex-row px-4 mt-4">
                    <OrderStatPill
                        icon="time-outline"
                        count={counts.pending}
                        label="Pending"
                        iconBg="#FFF5E6"
                        iconColor="#E69500"
                        labelColor="#E69500"
                    />
                    <OrderStatPill
                        icon="flame-outline"
                        count={counts.preparing}
                        label="Preparing"
                        iconBg="#FFF0E8"
                        iconColor="#F26B1D"
                        labelColor="#F26B1D"
                    />
                    <OrderStatPill
                        icon="bag-check-outline"
                        count={counts.ready}
                        label="Ready"
                        iconBg="#EAF8EC"
                        iconColor="#2E9E44"
                        labelColor="#2E9E44"
                    />
                </View>

                <View className="flex-row bg-gray-100 rounded-full mx-4 mt-4 p-1">
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <TouchableOpacity
                                key={f.key}
                                onPress={() => setFilter(f.key)}
                                className={`flex-1 items-center py-2.5 rounded-full ${active ? "bg-primary" : ""}`}
                            >
                                <Text className={`text-xs font-bold ${active ? "text-white" : "text-text opacity-50"}`}>
                                    {f.label} ({f.count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <Text className="text-gray-400">Loading orders...</Text>
                    </View>
                ) : error ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-gray-500 text-center">{error}</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-gray-400 text-center">No orders in this view.</Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1 px-4 pt-4"
                        contentContainerStyle={{ paddingBottom: 24 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
                    >
                        {filtered.map((order) => (
                            <StaffOrderCard key={order.id} order={order} />
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}