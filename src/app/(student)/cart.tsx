import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LoadingScreen from "../../components/shared/LoadingScreen";
import { placeOrder } from "../../services/order";
import { CartLine, useCartStore } from "../../store/cartStore";

const LOAD_TIMEOUT_MS = 10000;

function CartLineRow({ line }: { line: CartLine }) {
  const incrementLine = useCartStore((s) => s.incrementLine);
  const decrementLine = useCartStore((s) => s.decrementLine);
  const removeLine = useCartStore((s) => s.removeLine);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleRemove = () => {
    // Slide the row out to the left and fade it, then remove it from the
    // store once it's off-screen. LayoutAnimation right before the store
    // update animates the remaining rows sliding up to close the gap,
    // instead of them snapping into place instantly.
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -500,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        removeLine(line.id);
      }
    });
  };

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      <View className="flex-row bg-card rounded-2xl mb-3 p-3 border border-border items-center">
        <View className="w-16 h-16 rounded-xl overflow-hidden bg-backgroundAlt items-center justify-center mr-3">
          {line.imageUrl ? (
            <Image source={{ uri: line.imageUrl }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Ionicons name="fast-food-outline" size={24} color="#9CA3AF" />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-text" numberOfLines={1}>
            {line.menuItemName}
          </Text>
          {line.variantLabel && <Text className="text-xs text-text opacity-50 mt-0.5">{line.variantLabel}</Text>}
          <Text className="text-sm font-semibold text-primary mt-1">₱{line.unitPrice.toFixed(2)}</Text>
        </View>

        <View className="items-end">
          <TouchableOpacity onPress={handleRemove} className="mb-2">
            <Ionicons name="trash-outline" size={18} color="#D32F2F" />
          </TouchableOpacity>

          <View className="flex-row items-center bg-backgroundAlt rounded-full">
            <TouchableOpacity
              onPress={() => decrementLine(line.id)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="remove" size={16} color="#2B2B2B" />
            </TouchableOpacity>
            <Text className="w-6 text-center text-sm font-semibold text-text">{line.quantity}</Text>
            <TouchableOpacity
              onPress={() => incrementLine(line.id)}
              className="w-8 h-8 items-center justify-center"
            >
              <Ionicons name="add" size={16} color="#2B2B2B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lines = useCartStore((s) => s.lines);
  const loaded = useCartStore((s) => s.loaded);
  const loadCart = useCartStore((s) => s.loadCart);
  const total = useCartStore((s) => s.total());
  const clear = useCartStore((s) => s.clear);
  const [placing, setPlacing] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Tab screens (even hidden `href: null` ones) stay mounted after you
  // navigate away, so `placing` never resets by unmounting. Reset it when the
  // screen loses focus instead -- it happens while the screen is off-screen,
  // so the normal cart UI never flashes in during the redirect to Orders.
  useFocusEffect(
    useCallback(() => {
      return () => setPlacing(false);
    }, [])
  );

  // Don't rely on some other screen/hook having loaded the cart first: if
  // it hasn't loaded yet, load it here. If the request hasn't settled after
  // LOAD_TIMEOUT_MS, stop showing an endless spinner and offer a retry.
  // If it resolves after the timeout, `loaded` flips and the UI recovers.
  const fetchCart = useCallback(async () => {
    setLoadTimedOut(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), LOAD_TIMEOUT_MS);
    });

    const result = await Promise.race([loadCart().then(() => "ok" as const), timeout]);
    if (timer) clearTimeout(timer);

    if (result === "timeout" && !useCartStore.getState().loaded) {
      setLoadTimedOut(true);
    }
  }, [loadCart]);

  useEffect(() => {
    if (!useCartStore.getState().loaded) {
      fetchCart();
    }
  }, [fetchCart]);

  const handleCheckout = async () => {
    if (lines.length === 0) return;

    setPlacing(true);
    try {
      const order = await placeOrder({
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          variantId: l.variantId,
          quantity: l.quantity,
        })),
      });

      await clear();
      router.replace(`/(student)/orders?justPlaced=${order.id}`);
    } catch (err: any) {
      console.error("Failed to place order:", err);
      Alert.alert(
        "Couldn't place your order",
        err?.message ?? "Something went wrong, or an item may no longer be available. Please try again."
      );
      setPlacing(false);
    }
    // No `finally` here -- on success we're navigating away via replace(),
    // so we deliberately leave `placing` true and let the blur cleanup in
    // useFocusEffect above reset it once the screen is off-screen.
  };

  // Blocking transition: takes over the whole screen while the order is placed.
  if (placing) {
    return <LoadingScreen label="LOADING" />;
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as staff screens */}
      <View
        className="bg-primary px-5 pb-8 flex-row items-center"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">My Cart</Text>
      </View>

      {/* Rounded-top sheet, same reveal pattern as staff screens */}
      <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
        {!loaded ? (
          loadTimedOut ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="cloud-offline-outline" size={28} color="#800020" />
              </View>
              <Text className="text-text font-bold text-base text-center mb-1">
                Couldn't load your cart
              </Text>
              <Text className="text-text opacity-50 text-sm text-center mb-6">
                This is taking longer than expected. Check your connection and try again.
              </Text>
              <TouchableOpacity onPress={fetchCart} className="bg-primary rounded-full px-6 py-3">
                <Text className="text-white font-bold">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <LoadingScreen fullScreen={false} />
          )
        ) : lines.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons name="bag-outline" size={28} color="#800020" />
            </View>
            <Text className="text-text font-bold text-base text-center mb-1">Your cart is empty</Text>
            <Text className="text-text opacity-50 text-sm text-center mb-6">
              Add something from the menu to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(student)/home")}
              className="bg-primary rounded-full px-6 py-3"
            >
              <Text className="text-white font-bold">Browse Menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 20, paddingBottom: 12 }}>
              {lines.map((line) => (
                <CartLineRow key={line.id} line={line} />
              ))}
            </ScrollView>

            <View
              className="bg-card border-t border-border px-5 pt-4"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <View className="flex-row justify-between mb-4">
                <Text className="text-base text-text opacity-60">Total</Text>
                <Text className="text-xl font-bold text-primary">₱{total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleCheckout}
                disabled={placing}
                className="rounded-full py-4 items-center bg-primary"
              >
                <Text className="text-white font-bold text-base">Place Order</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}