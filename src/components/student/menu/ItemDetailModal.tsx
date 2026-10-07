import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { MenuItem, MenuItemVariant } from "../../../types/menu";
import { haptics } from "../../../utils/haptics";
import PressableScale from "../../shared/PressableScale";

type SourceRect = { x: number; y: number; width: number; height: number };

type Props = {
  item: MenuItem | null;
  stockRemaining: number | null; // null = unlimited/no cap
  visible: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, variant: MenuItemVariant | null, quantity: number, source: SourceRect) => void;
  onOrderNow: (item: MenuItem, variant: MenuItemVariant | null, quantity: number, source: SourceRect) => void;
};

const LOW_STOCK_THRESHOLD = 5;
const SHEET_SPRING = { damping: 22, stiffness: 260, mass: 0.9 };
const CLOSE_DURATION = 220;
// Drag past this distance, or release with this downward speed, to dismiss.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

export default function ItemDetailModal({
  item,
  stockRemaining,
  visible,
  onClose,
  onAddToCart,
  onOrderNow,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const imageWrapperRef = useRef<View>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // The parent nulls `item` the instant it closes us, which would make the
  // content vanish mid-exit. Keep the last item and stock value on screen
  // until the slide-out finishes.
  const [shownItem, setShownItem] = useState<MenuItem | null>(null);
  const [shownStock, setShownStock] = useState<number | null>(null);

  // `mounted` keeps the native Modal alive during the exit animation.
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  // Add-to-cart / order-now close instantly: the flying image starts at the
  // sheet image's position, and a sheet still sliding away would show two images.
  const instantCloseRef = useRef(false);

  const translateY = useSharedValue(screenH);
  const startY = useSharedValue(0);

  useEffect(() => {
    if (item) {
      setSelectedVariantId(item.variants.length > 0 ? item.variants[0].id : null);
      setQuantity(1);
    }
  }, [item?.id]);

  // Follow live changes (stock ticking down, staff editing the item) while open.
  useEffect(() => {
    if (item) {
      setShownItem(item);
      setShownStock(stockRemaining);
    }
  }, [item, stockRemaining]);

  const finishClose = () => {
    mountedRef.current = false;
    setMounted(false);
  };

  useEffect(() => {
    if (visible && item) {
      if (!mountedRef.current) {
        mountedRef.current = true;
        translateY.value = screenH;
        setMounted(true);
      }
      translateY.value = withSpring(0, SHEET_SPRING);
      return;
    }

    if (!mountedRef.current) return;

    if (instantCloseRef.current) {
      instantCloseRef.current = false;
      translateY.value = screenH;
      finishClose();
      return;
    }

    // Slides out from wherever it currently is -- including mid-drag.
    translateY.value = withTiming(
      screenH,
      { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        "worklet";
        if (finished) scheduleOnRN(finishClose);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, item?.id]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Only a downward drag of 12px+ starts it, so taps on the chips,
        // stepper and buttons are never swallowed.
        .activeOffsetY(12)
        .failOffsetX([-30, 30])
        .onStart(() => {
          startY.value = translateY.value;
        })
        .onUpdate((e) => {
          translateY.value = Math.max(0, startY.value + e.translationY);
        })
        .onEnd((e) => {
          if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
            scheduleOnRN(onClose);
          } else {
            translateY.value = withSpring(0, SHEET_SPRING);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onClose]
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Backdrop fades with the sheet's position, so dragging down dims out smoothly.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, screenH * 0.7], [1, 0], Extrapolation.CLAMP),
  }));

  if (!shownItem) return null;

  const isSoldOut = shownStock !== null && shownStock <= 0;
  const isLowStock = shownStock !== null && shownStock > 0 && shownStock <= LOW_STOCK_THRESHOLD;
  const isDisabled = !shownItem.available || isSoldOut;

  const maxQuantity = shownStock !== null ? Math.max(shownStock, 1) : 99;

  const selectedVariant = shownItem.variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = selectedVariant ? selectedVariant.price : shownItem.price ?? 0;
  const lineTotal = unitPrice * quantity;

  const trigger = (mode: "cart" | "now") => {
    if (isDisabled) return;
    imageWrapperRef.current?.measureInWindow((x, y, width, height) => {
      instantCloseRef.current = true;
      onClose();
      const source = { x, y, width, height };
      if (mode === "cart") {
        onAddToCart(shownItem, selectedVariant, quantity, source);
      } else {
        onOrderNow(shownItem, selectedVariant, quantity, source);
      }
    });
  };

  const decrement = () => {
    if (quantity <= 1) return;
    haptics.select();
    setQuantity(quantity - 1);
  };

  const increment = () => {
    if (quantity >= maxQuantity) return;
    haptics.select();
    setQuantity(quantity + 1);
  };

  const subtitle = [shownItem.categoryName, shownItem.subcategoryName].filter(Boolean).join(" · ");

  return (
    // The translucent flags make the Modal draw edge-to-edge under the status
    // and navigation bars (Android), so the backdrop covers the whole screen
    // and the sheet's bottom padding keeps its content clear of the bar.
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modal content lives in its own native root, outside the app's
          GestureHandlerRootView -- the drag gesture needs one here too. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }, backdropStyle]}
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#fff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              },
              sheetStyle,
            ]}
          >
            <View ref={imageWrapperRef} collapsable={false} className="w-full h-56 bg-gray-100">
              {shownItem.imageUrl ? (
                <Image source={{ uri: shownItem.imageUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="fast-food-outline" size={48} color="#C9B8BD" />
                </View>
              )}

              {/* Drag handle: hints that the sheet can be pulled down. */}
              <View className="absolute top-2 left-0 right-0 items-center" pointerEvents="none">
                <View className="w-10 h-1.5 rounded-full bg-white/80" />
              </View>

              <TouchableOpacity
                onPress={onClose}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>

              {shownItem.isSpecial && (
                <View className="absolute top-3 left-3 bg-amber-400 px-2.5 py-1 rounded-full flex-row items-center">
                  <Ionicons name="star" size={12} color="#fff" />
                  <Text className="text-white text-xs font-bold ml-1">Today's Special</Text>
                </View>
              )}

              {isSoldOut && (
                <View className="absolute inset-0 bg-black/40 items-center justify-center">
                  <View className="bg-danger px-4 py-2 rounded-full">
                    <Text className="text-white text-sm font-bold">Sold Out</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="px-5 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
              <Text className="text-xl font-bold text-text">{shownItem.name}</Text>

              {subtitle.length > 0 && (
                <Text className="text-xs text-text opacity-40 mt-1">{subtitle}</Text>
              )}

              {shownItem.description && (
                <Text className="text-sm text-text opacity-60 mt-2 leading-5">{shownItem.description}</Text>
              )}

              {!shownItem.available && !isSoldOut && (
                <View className="flex-row items-center bg-gray-100 rounded-xl mt-3 px-3 py-2">
                  <Ionicons name="close-circle-outline" size={16} color="#9CA3AF" />
                  <Text className="text-xs text-text opacity-50 ml-2">Currently unavailable</Text>
                </View>
              )}

              {isSoldOut && (
                <View className="flex-row items-center bg-red-50 rounded-xl mt-3 px-3 py-2">
                  <Ionicons name="alert-circle-outline" size={16} color="#D32F2F" />
                  <Text className="text-xs text-danger ml-2">Sold out for today</Text>
                </View>
              )}

              {isLowStock && !isDisabled && (
                <View className="flex-row items-center bg-orange-50 rounded-xl mt-3 px-3 py-2">
                  <Ionicons name="alert-circle-outline" size={16} color="#F26B1D" />
                  <Text className="text-xs text-orange-700 ml-2 font-semibold">
                    Only {shownStock} left today
                  </Text>
                </View>
              )}

              {shownItem.variants.length > 0 && (
                <View className="mt-4">
                  <Text className="text-sm font-semibold text-text mb-2">Size</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {shownItem.variants.map((variant) => {
                      const selected = variant.id === selectedVariantId;
                      return (
                        <Pressable
                          key={variant.id}
                          disabled={isDisabled}
                          onPress={() => {
                            if (!selected) haptics.select();
                            setSelectedVariantId(variant.id);
                          }}
                          className={`px-4 py-2 rounded-full border ${
                            selected ? "bg-primary border-primary" : "bg-white border-border"
                          } ${isDisabled ? "opacity-40" : ""}`}
                        >
                          <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-text"}`}>
                            {variant.label} · ₱{variant.price.toFixed(2)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {!isDisabled && (
                <View className="flex-row items-center justify-between mt-5">
                  <Text className="text-sm font-semibold text-text">Quantity</Text>
                  <View className="flex-row items-center bg-gray-100 rounded-full">
                    <TouchableOpacity onPress={decrement} className="w-9 h-9 items-center justify-center">
                      <Ionicons name="remove" size={18} color="#2B2B2B" />
                    </TouchableOpacity>
                    <Text className="w-6 text-center text-base font-semibold text-text">{quantity}</Text>
                    <TouchableOpacity onPress={increment} className="w-9 h-9 items-center justify-center">
                      <Ionicons name="add" size={18} color="#2B2B2B" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="flex-row gap-3 mt-6">
                <View className="flex-1">
                  <PressableScale
                    scaleTo={0.96}
                    haptic="tap"
                    disabled={isDisabled}
                    onPress={() => trigger("cart")}
                    className={`rounded-full py-3.5 items-center border ${
                      isDisabled ? "border-disabled" : "border-primary"
                    }`}
                  >
                    <Text className={`font-bold ${isDisabled ? "text-disabled" : "text-primary"}`}>
                      {isDisabled ? "Unavailable" : `Add to Cart · ₱${lineTotal.toFixed(2)}`}
                    </Text>
                  </PressableScale>
                </View>

                <View className="flex-1">
                  <PressableScale
                    scaleTo={0.96}
                    haptic="tap"
                    disabled={isDisabled}
                    onPress={() => trigger("now")}
                    className={`rounded-full py-3.5 items-center ${isDisabled ? "bg-disabled" : "bg-primary"}`}
                  >
                    <Text className="text-white font-bold">{isDisabled ? "Unavailable" : "Order Now"}</Text>
                  </PressableScale>
                </View>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}