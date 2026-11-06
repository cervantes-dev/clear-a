import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import CanteenClosedBanner from "../../components/shared/CanteenClosedBanner";
import LoadingScreen from "../../components/shared/LoadingScreen";
import UndoSnackbar from "../../components/shared/UndoSnackbar";
import OrderNoteModal from "../../components/student/cart/OrderNoteModal";
import { useStudentMenu } from "../../hooks/useStudentMenu";
import { placeOrder } from "../../services/order";
import { useCanteenStore } from "../../store/canteenStore";
import { CartLine, useCartStore } from "../../store/cartStore";
import { haptics } from "../../utils/haptics";

const LOAD_TIMEOUT_MS = 10000;
const CLEAR_TIMEOUT_MS = 2500;
// Custom SQLSTATE raised by the database when an order is attempted while closed.
const CANTEEN_CLOSED_CODE = "CL001";

type LineIssue =
  | { kind: "unavailable"; label: string }
  | { kind: "soldout"; label: string }
  | { kind: "limited"; label: string; max: number };

type LineInfo = { issue?: LineIssue; canIncrease: boolean };

type Removed = { line: CartLine; index: number; token: number };

function CartLineRow({
  line,
  index,
  info,
  onRemoved,
}: {
  line: CartLine;
  index: number;
  info: LineInfo;
  onRemoved: (line: CartLine, index: number) => void;
}) {
  const incrementLine = useCartStore((s) => s.incrementLine);
  const decrementLine = useCartStore((s) => s.decrementLine);
  const removeLine = useCartStore((s) => s.removeLine);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const { issue, canIncrease } = info;
  const blocked = issue?.kind === "unavailable" || issue?.kind === "soldout";

  const handleRemove = () => {
    haptics.tap();
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
        onRemoved(line, index);
      }
    });
  };

  const handleIncrease = () => {
    if (!canIncrease) {
      haptics.warning();
      return;
    }
    haptics.select();
    incrementLine(line.id);
  };

  const handleDecrease = () => {
    haptics.select();
    decrementLine(line.id);
  };

  return (
    <Animated.View style={{ transform: [{ translateX }], opacity }}>
      <View
        className={`flex-row bg-card rounded-2xl mb-3 p-3 border items-center ${
          issue ? "border-danger/40" : "border-border"
        }`}
      >
        <View className="flex-row flex-1 items-center" style={{ opacity: blocked ? 0.55 : 1 }}>
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
        </View>

        <View className="items-end ml-3">
          <TouchableOpacity
            onPress={handleRemove}
            hitSlop={8}
            className="mb-2"
            accessibilityRole="button"
            accessibilityLabel={`Remove ${line.menuItemName} from cart`}
          >
            <Ionicons name="trash-outline" size={18} color="#D32F2F" />
          </TouchableOpacity>

          <View className="flex-row items-center bg-backgroundAlt rounded-full">
            <TouchableOpacity
              onPress={handleDecrease}
              className="w-8 h-8 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity of ${line.menuItemName}`}
            >
              <Ionicons name="remove" size={16} color="#2B2B2B" />
            </TouchableOpacity>
            <Text className="w-6 text-center text-sm font-semibold text-text">{line.quantity}</Text>
            <TouchableOpacity
              onPress={handleIncrease}
              className="w-8 h-8 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity of ${line.menuItemName}`}
              accessibilityState={{ disabled: !canIncrease }}
            >
              <Ionicons name="add" size={16} color={canIncrease ? "#2B2B2B" : "#C9B8BD"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {issue && (
        <View className="flex-row items-center -mt-1.5 mb-3 ml-1">
          <Ionicons name="alert-circle" size={13} color="#D32F2F" />
          <Text className="text-danger text-xs font-semibold ml-1">{issue.label}</Text>
        </View>
      )}
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
  const removeLine = useCartStore((s) => s.removeLine);
  const setLineQuantity = useCartStore((s) => s.setLineQuantity);
  const restoreLine = useCartStore((s) => s.restoreLine);

  const canteenStatus = useCanteenStore((s) => s.status);
  const loadCanteen = useCanteenStore((s) => s.load);
  // null (not loaded yet) counts as open: the server enforces the hours anyway.
  const isClosed = canteenStatus !== null && !canteenStatus.isOpen;

  // Live menu + stock, used to flag lines that can no longer be ordered.
  const { menuItems, stockMap, loading: menuLoading, error: menuError } = useStudentMenu();

  const [placing, setPlacing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [note, setNote] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);

  // Tab screens (even hidden `href: null` ones) stay mounted after you
  // navigate away, so `placing` never resets by unmounting. Reset it when the
  // screen loses focus instead -- it happens while the screen is off-screen,
  // so the normal cart UI never flashes in during the redirect to Orders.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setPlacing(false);
        setRemoved(null);
        setNoteVisible(false);
      };
    }, [])
  );

  // An emptied cart shouldn't carry a note over to the next order.
  useEffect(() => {
    if (loaded && lines.length === 0) setNote("");
  }, [loaded, lines.length]);

  // Don't rely on some other screen/hook having loaded the cart first: if
  // it hasn't loaded yet, load it here. A failed or stalled request (no
  // result after LOAD_TIMEOUT_MS) shows a retry instead of an endless
  // spinner or a false "cart is empty". If a stalled request finishes later,
  // `loaded` flips and the UI recovers on its own.
  const fetchCart = useCallback(async () => {
    setLoadFailed(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), LOAD_TIMEOUT_MS);
    });

    const result = await Promise.race([loadCart(), timeout]);
    if (timer) clearTimeout(timer);

    if (!useCartStore.getState().loaded && (result === "timeout" || result === false)) {
      setLoadFailed(true);
    }
  }, [loadCart]);

  useEffect(() => {
    if (!useCartStore.getState().loaded) {
      fetchCart();
    }
  }, [fetchCart]);

  // Per-line availability. Until the menu has loaded (or if it failed) we
  // don't flag anything -- the server still enforces availability and stock
  // at checkout, this is only here to warn the student earlier.
  const lineInfo = useMemo(() => {
    const info: Record<string, LineInfo> = {};
    const menuReady = !menuLoading && !menuError;
    const menuById = new Map(menuItems.map((m) => [m.id, m]));

    // Several lines can share one item's stock (e.g. two sizes of the same
    // drink), so allocate the remaining stock across them in cart order.
    const totals: Record<string, number> = {};
    for (const l of lines) totals[l.menuItemId] = (totals[l.menuItemId] ?? 0) + l.quantity;
    const allocated: Record<string, number> = {};

    for (const l of lines) {
      if (!menuReady) {
        info[l.id] = { canIncrease: true };
        continue;
      }

      const item = menuById.get(l.menuItemId);
      if (!item) {
        info[l.id] = { issue: { kind: "unavailable", label: "No longer on the menu" }, canIncrease: false };
        continue;
      }
      if (!item.available) {
        info[l.id] = { issue: { kind: "unavailable", label: "Currently unavailable" }, canIncrease: false };
        continue;
      }

      const remaining = stockMap[item.id]?.remainingQuantity ?? null;
      if (remaining === null) {
        info[l.id] = { canIncrease: true };
        continue;
      }

      const used = allocated[item.id] ?? 0;
      const max = remaining - used;
      allocated[item.id] = used + Math.min(l.quantity, Math.max(max, 0));

      if (remaining <= 0 || max <= 0) {
        info[l.id] = { issue: { kind: "soldout", label: "Sold out" }, canIncrease: false };
      } else if (l.quantity > max) {
        info[l.id] = {
          issue: { kind: "limited", label: `Only ${max} left`, max },
          canIncrease: false,
        };
      } else {
        info[l.id] = { canIncrease: totals[item.id] < remaining };
      }
    }

    return info;
  }, [lines, menuItems, stockMap, menuLoading, menuError]);

  const issueCount = Object.values(lineInfo).filter((i) => i.issue).length;
  const hasIssues = issueCount > 0;
  const checkoutBlocked = hasIssues || isClosed;

  const fixCart = () => {
    haptics.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    for (const l of lines) {
      const issue = lineInfo[l.id]?.issue;
      if (!issue) continue;
      if (issue.kind === "limited") setLineQuantity(l.id, issue.max);
      else removeLine(l.id);
    }
  };

  const handleRemoved = useCallback((line: CartLine, index: number) => {
    setRemoved({ line, index, token: Date.now() });
  }, []);

  const handleUndo = () => {
    if (!removed) return;
    haptics.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    restoreLine(removed.line, removed.index);
    setRemoved(null);
  };

  const handleSaveNote = (next: string) => {
    setNote(next);
    setNoteVisible(false);
  };

  const handleCheckout = async () => {
    if (placing || lines.length === 0 || hasIssues || isClosed) return;

    setRemoved(null);
    setPlacing(true);
    try {
      const order = await placeOrder({
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        note,
      });

      haptics.success();
      setNote("");

      // The order is already placed: never let a slow cart-clear request hold
      // up the redirect, and keep the cart empty locally even if it fails.
      await Promise.race([
        clear({ keepEmptyOnError: true }),
        new Promise<void>((resolve) => setTimeout(resolve, CLEAR_TIMEOUT_MS)),
      ]);
      router.replace(`/(student)/orders?justPlaced=${order.id}`);
    } catch (err: any) {
      console.error("Failed to place order:", err);
      haptics.warning();
      // The canteen closed while this screen was open (e.g. at 5:00 PM): pull
      // the fresh status so the banner and the disabled button appear at once.
      if (err?.code === CANTEEN_CLOSED_CODE) loadCanteen();
      Alert.alert(
        err?.code === CANTEEN_CLOSED_CODE ? "The canteen is closed" : "Couldn't place your order",
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

  // Sit above the checkout footer when there is one, otherwise above the
  // bottom edge (e.g. right after removing the last item).
  const snackbarBottom = lines.length > 0 ? footerHeight + 12 : insets.bottom + 24;

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as staff screens */}
      <View
        className="bg-primary px-5 pb-8 flex-row items-center"
        style={{ paddingTop: insets.top + 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">My Cart</Text>
      </View>

      {/* Rounded-top sheet, same reveal pattern as staff screens */}
      <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
        {!loaded ? (
          loadFailed ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name="cloud-offline-outline" size={28} color="#800020" />
              </View>
              <Text className="text-text font-bold text-base text-center mb-1">
                Couldn't load your cart
              </Text>
              <Text className="text-text opacity-50 text-sm text-center mb-6">
                Check your connection and try again.
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
            <ScrollView
              className="flex-1 px-4"
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {isClosed && canteenStatus && (
                <View className="mb-3">
                  <CanteenClosedBanner status={canteenStatus} />
                </View>
              )}

              {hasIssues && (
                <View className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-3">
                  <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                  <View className="flex-1 ml-3 mr-2">
                    <Text className="text-text font-semibold text-sm">Some items need your attention</Text>
                    <Text className="text-text opacity-50 text-xs mt-0.5">
                      Unavailable or sold-out items can't be ordered.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={fixCart}
                    className="bg-danger rounded-full px-3.5 py-2"
                    accessibilityRole="button"
                    accessibilityLabel="Fix cart"
                  >
                    <Text className="text-white text-xs font-bold">Fix cart</Text>
                  </TouchableOpacity>
                </View>
              )}

              {lines.map((line, index) => (
                <CartLineRow
                  key={line.id}
                  line={line}
                  index={index}
                  info={lineInfo[line.id] ?? { canIncrease: true }}
                  onRemoved={handleRemoved}
                />
              ))}

              <TouchableOpacity
                onPress={() => setNoteVisible(true)}
                className="flex-row items-center bg-card border border-border rounded-2xl px-4 py-3.5 mb-3"
                accessibilityRole="button"
                accessibilityLabel={note ? "Edit note for the canteen" : "Add a note for the canteen"}
              >
                <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
                  <Ionicons name={note ? "chatbox-ellipses" : "chatbox-ellipses-outline"} size={18} color="#800020" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-text font-semibold text-sm">
                    {note ? "Note for the canteen" : "Add a note"}
                  </Text>
                  <Text className="text-text opacity-50 text-xs mt-0.5" numberOfLines={2}>
                    {note || "Optional — no onions, less spicy…"}
                  </Text>
                </View>
                <Ionicons name={note ? "create-outline" : "chevron-forward"} size={16} color="#999" />
              </TouchableOpacity>
            </ScrollView>

            <View
              className="bg-card border-t border-border px-5 pt-4"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            >
              <View className="flex-row justify-between mb-4">
                <Text className="text-base text-text opacity-60">Total</Text>
                <Text className="text-xl font-bold text-primary">₱{total.toFixed(2)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleCheckout}
                disabled={placing || checkoutBlocked}
                className={`rounded-full py-4 items-center ${checkoutBlocked ? "bg-disabled" : "bg-primary"}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: checkoutBlocked }}
              >
                <Text className="text-white font-bold text-base">
                  {isClosed ? "Canteen is closed" : hasIssues ? "Fix cart to continue" : "Place Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {removed && (
          <UndoSnackbar
            token={removed.token}
            message={`${removed.line.menuItemName} removed`}
            actionLabel="Undo"
            bottom={snackbarBottom}
            onAction={handleUndo}
            onDismiss={() => setRemoved(null)}
          />
        )}
      </View>

      <OrderNoteModal
        visible={noteVisible}
        initialValue={note}
        onSave={handleSaveNote}
        onClose={() => setNoteVisible(false)}
      />
    </View>
  );
}