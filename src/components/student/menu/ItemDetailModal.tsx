import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { MenuItem, MenuItemVariant } from "../../../types/menu";

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

export default function ItemDetailModal({
  item,
  stockRemaining,
  visible,
  onClose,
  onAddToCart,
  onOrderNow,
}: Props) {
  const imageWrapperRef = useRef<View>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setSelectedVariantId(item.variants.length > 0 ? item.variants[0].id : null);
      setQuantity(1);
    }
  }, [item?.id]);

  if (!item) return null;

  const isSoldOut = stockRemaining !== null && stockRemaining <= 0;
  const isLowStock = stockRemaining !== null && stockRemaining > 0 && stockRemaining <= LOW_STOCK_THRESHOLD;
  const isDisabled = !item.available || isSoldOut;

  const maxQuantity = stockRemaining !== null ? Math.max(stockRemaining, 1) : 99;

  const selectedVariant = item.variants.find((v) => v.id === selectedVariantId) ?? null;
  const unitPrice = selectedVariant ? selectedVariant.price : item.price ?? 0;
  const lineTotal = unitPrice * quantity;

  const trigger = (mode: "cart" | "now") => {
    if (isDisabled) return;
    imageWrapperRef.current?.measureInWindow((x, y, width, height) => {
      onClose();
      const source = { x, y, width, height };
      if (mode === "cart") {
        onAddToCart(item, selectedVariant, quantity, source);
      } else {
        onOrderNow(item, selectedVariant, quantity, source);
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
          <View ref={imageWrapperRef} collapsable={false} className="w-full h-56 bg-gray-100">
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="fast-food-outline" size={48} color="#C9B8BD" />
              </View>
            )}

            <TouchableOpacity
              onPress={onClose}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>

            {item.isSpecial && (
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

          <View className="px-5 pt-4 pb-6">
            <Text className="text-xl font-bold text-text">{item.name}</Text>

            {[item.categoryName, item.subcategoryName].filter(Boolean).length > 0 && (
              <Text className="text-xs text-text opacity-40 mt-1">
                {[item.categoryName, item.subcategoryName].filter(Boolean).join(" · ")}
              </Text>
            )}

            {item.description && (
              <Text className="text-sm text-text opacity-60 mt-2 leading-5">{item.description}</Text>
            )}

            {!item.available && !isSoldOut && (
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
                  Only {stockRemaining} left today
                </Text>
              </View>
            )}

            {item.variants.length > 0 && (
              <View className="mt-4">
                <Text className="text-sm font-semibold text-text mb-2">Size</Text>
                <View className="flex-row flex-wrap gap-2">
                  {item.variants.map((variant) => {
                    const selected = variant.id === selectedVariantId;
                    return (
                      <TouchableOpacity
                        key={variant.id}
                        disabled={isDisabled}
                        onPress={() => setSelectedVariantId(variant.id)}
                        className={`px-4 py-2 rounded-full border ${
                          selected ? "bg-primary border-primary" : "bg-white border-border"
                        } ${isDisabled ? "opacity-40" : ""}`}
                      >
                        <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-text"}`}>
                          {variant.label} · ₱{variant.price.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {!isDisabled && (
              <View className="flex-row items-center justify-between mt-5">
                <Text className="text-sm font-semibold text-text">Quantity</Text>
                <View className="flex-row items-center bg-gray-100 rounded-full">
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 items-center justify-center"
                  >
                    <Ionicons name="remove" size={18} color="#2B2B2B" />
                  </TouchableOpacity>
                  <Text className="w-6 text-center text-base font-semibold text-text">{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                    className="w-9 h-9 items-center justify-center"
                  >
                    <Ionicons name="add" size={18} color="#2B2B2B" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => trigger("cart")}
                disabled={isDisabled}
                className={`flex-1 rounded-full py-3.5 items-center border ${
                  isDisabled ? "border-disabled" : "border-primary"
                }`}
              >
                <Text className={`font-bold ${isDisabled ? "text-disabled" : "text-primary"}`}>
                  {isDisabled ? "Unavailable" : `Add to Cart · ₱${lineTotal.toFixed(2)}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => trigger("now")}
                disabled={isDisabled}
                className={`flex-1 rounded-full py-3.5 items-center ${
                  isDisabled ? "bg-disabled" : "bg-primary"
                }`}
              >
                <Text className="text-white font-bold">{isDisabled ? "Unavailable" : "Order Now"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}