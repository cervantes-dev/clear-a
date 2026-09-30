import PickupConfirmedModal from "@/components/staff/orders/PickupConfirmedModal";
import ScanErrorModal from "@/components/staff/orders/ScanErrorModal";
import { getOrderById, updateOrderStatus } from "@/services/order";
import { Order } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ConfirmedInfo = { orderLabel?: string; studentName: string | null };
type ScanError = { title: string; message: string; icon: keyof typeof Ionicons.glyphMap };

// Postgres/PostgREST codes that mean "this QR doesn't point at an order":
// PGRST116 = .single() found no rows, 22P02 = the scanned text isn't a valid uuid.
const INVALID_QR_CODES = ["PGRST116", "22P02"];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedInfo | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);

  const handleScan = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      // `data` is just an order UUID -- nothing decoded from the QR itself is
      // trusted beyond this ID. Everything shown below is fetched fresh from
      // Supabase, so a screenshotted or tampered QR image can't fake order
      // contents; it can at most point to a real order that isn't actually
      // this student's, which staff visually catches by comparing details.
      const fetched = await getOrderById(data);
      setOrder(fetched);
    } catch (err: any) {
      if (INVALID_QR_CODES.includes(err?.code)) {
        setScanError({
          title: "Invalid QR code",
          message: "This doesn't match any order.",
          icon: "qr-code-outline",
        });
      } else {
        setScanError({
          title: "Couldn't load order",
          message: "Check your connection and try scanning again.",
          icon: "cloud-offline-outline",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      await updateOrderStatus(order.id, "completed");
      setConfirmed({
        orderLabel: order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : undefined,
        studentName: order.studentName,
      });
    } catch (err: any) {
      Alert.alert("Couldn't confirm pickup", err?.message ?? "Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const resetScan = () => {
    setOrder(null);
    setScanned(false);
  };

  const handleScanNext = () => {
    setConfirmed(null);
    resetScan();
  };

  const handleDone = () => {
    setConfirmed(null);
    router.back();
  };

  const handleTryAgain = () => {
    setScanError(null);
    setScanned(false);
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <StatusBar style="light" />
        <Ionicons name="camera-outline" size={48} color="#fff" />
        <Text className="text-white text-base font-semibold mt-4 text-center">
          Camera access is needed to scan pickup QR codes
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-primary rounded-full px-6 py-3 mt-6"
        >
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-white/60 text-sm">Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-5"
        style={{ top: insets.top + 12 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-base">Scan Pickup QR</Text>
        <View className="w-10" />
      </View>

      {!order && !loading && (
        <View className="absolute left-0 right-0 items-center" style={{ top: "40%" }}>
          <View className="w-64 h-64 border-2 border-white/70 rounded-3xl" />
          <Text className="text-white/80 text-sm mt-4">Align QR code within the frame</Text>
        </View>
      )}

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-black/40">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {order && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-text">
              #{order.orderNumber ? String(order.orderNumber).padStart(3, "0") : "—"}
            </Text>
            <View
              className="px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: order.status === "ready" ? "#EAF8EC" : "#FDECEA",
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: order.status === "ready" ? "#2E9E44" : "#D32F2F" }}
              >
                {order.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-text opacity-60 mb-3">{order.studentName ?? "Unknown student"}</Text>

          {order.items.map((item) => (
            <Text key={item.id} className="text-sm text-text opacity-80" numberOfLines={1}>
              {item.quantity}× {item.menuItemName}
              {item.variantLabel ? ` (${item.variantLabel})` : ""}
            </Text>
          ))}

          <Text className="text-base font-bold text-primary mt-2">₱{order.total.toFixed(2)}</Text>

          {order.status !== "ready" ? (
            <View className="bg-red-50 rounded-xl px-3 py-2.5 mt-4">
              <Text className="text-danger text-sm font-semibold text-center">
                This order is not ready for pickup (status: {order.status}).
              </Text>
            </View>
          ) : null}

          <View className="flex-row gap-3 mt-4">
            <TouchableOpacity
              onPress={resetScan}
              className="flex-1 border border-border rounded-full py-3.5 items-center"
            >
              <Text className="text-text font-semibold">Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmPickup}
              disabled={order.status !== "ready" || confirming}
              className={`flex-1 rounded-full py-3.5 items-center ${
                order.status !== "ready" || confirming ? "bg-disabled" : "bg-primary"
              }`}
            >
              {confirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-bold">Confirm Pickup</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PickupConfirmedModal
        visible={confirmed !== null}
        orderLabel={confirmed?.orderLabel}
        studentName={confirmed?.studentName}
        onScanNext={handleScanNext}
        onDone={handleDone}
      />

      <ScanErrorModal
        visible={scanError !== null}
        title={scanError?.title ?? ""}
        message={scanError?.message ?? ""}
        icon={scanError?.icon}
        onTryAgain={handleTryAgain}
      />
    </View>
  );
}