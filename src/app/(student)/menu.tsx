import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FlyingCartAnimation from "../../components/student/menu/FlyingCartAnimation";
import ItemDetailModal from "../../components/student/menu/ItemDetailModal";
import MenuGridCard from "../../components/student/menu/MenuGridCard";
import TodaySpecialSkeleton from "../../components/student/skeleton/TodaySpecialSkeleton";
import { useStudentMenu } from "../../hooks/useStudentMenu";
import { useCartStore } from "../../store/cartStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { MenuItem, MenuItemVariant } from "../../types/menu";

type Section = {
  title: string;
  data: MenuItem[];
};

type SourceRect = { x: number; y: number; width: number; height: number };
type PendingCommit = {
  item: MenuItem;
  variant: MenuItemVariant | null;
  quantity: number;
  navigateAfter: boolean;
};
type FlightState = {
  uri: string;
  source: SourceRect;
  target: { x: number; y: number };
};

export default function StudentMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { menuItems, categories, stockMap, loading, refreshing, error, refresh } = useStudentMenu();
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [flight, setFlight] = useState<FlightState | null>(null);

  const cartIconRef = useRef<View>(null);
  const pendingCommitRef = useRef<PendingCommit | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const itemCount = useCartStore((state) => state.itemCount());

  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const openDetail = (item: MenuItem) => setActiveItem(item);

  const launchFlight = (
    item: MenuItem,
    variant: MenuItemVariant | null,
    quantity: number,
    source: SourceRect,
    navigateAfter: boolean
  ) => {
    if (!item.imageUrl) {
      addItem(item, variant, quantity);
      if (navigateAfter) router.push("/(student)/cart");
      return;
    }

    cartIconRef.current?.measureInWindow((cx, cy, cw, ch) => {
      pendingCommitRef.current = { item, variant, quantity, navigateAfter };
      setFlight({
        uri: item.imageUrl as string,
        source,
        target: { x: cx + cw / 2, y: cy + ch / 2 },
      });
    });
  };

  const handleFlightComplete = () => {
    setFlight(null);
    const pending = pendingCommitRef.current;
    pendingCommitRef.current = null;
    if (!pending) return;

    addItem(pending.item, pending.variant, pending.quantity);
    if (pending.navigateAfter) {
      router.push("/(student)/cart");
    }
  };

  const sections: Section[] = [];

  const specialItems = menuItems.filter((i) => i.isSpecial);
  if (specialItems.length > 0) {
    sections.push({ title: "Today's Specials", data: specialItems });
  }

  for (const cat of categories) {
    const items = menuItems.filter((i) => i.categoryId === cat.id);
    if (items.length > 0) {
      sections.push({ title: cat.name, data: items });
    }
  }

  const uncategorized = menuItems.filter((i) => i.categoryId === null);
  if (uncategorized.length > 0) {
    sections.push({ title: "Other", data: uncategorized });
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as staff screens */}
      <View
        className="bg-primary px-5 pb-8 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View>
          <Text className="text-white text-2xl font-bold">Menu</Text>
          <Text className="text-white/80 text-sm mt-1">Browse today's offerings</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-11 h-11 rounded-full bg-white/15 items-center justify-center mr-2"
            onPress={() => router.push("/(student)/favorites")}
          >
            <Ionicons name="heart-outline" size={22} color="#fff" />
          </TouchableOpacity>

          <View ref={cartIconRef} collapsable={false}>
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-white/15 items-center justify-center"
              onPress={() => router.push("/(student)/cart")}
            >
              <Ionicons name="bag-outline" size={22} color="#fff" />
              {itemCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Rounded-top sheet, same reveal pattern as staff screens */}
      <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
        {loading ? (
          <View className="mt-6">
            <TodaySpecialSkeleton />
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-text opacity-60 text-center">{error}</Text>
          </View>
        ) : sections.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-text opacity-50 text-center">No menu items yet. Check back soon!</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          >
            {sections.map((section) => (
              <View key={section.title} className="mt-5">
                <Text className="text-lg font-bold text-text px-5 mb-3">{section.title}</Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  {section.data.map((item) => (
                    <MenuGridCard
                      key={item.id}
                      item={item}
                      stockRemaining={stockMap[item.id]?.remainingQuantity ?? null}
                      onPress={openDetail}
                      isFavorite={favoriteIds.has(item.id)}
                      onToggleFavorite={(i) => toggleFavorite(i.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <ItemDetailModal
        item={activeItem}
        stockRemaining={activeItem ? stockMap[activeItem.id]?.remainingQuantity ?? null : null}
        visible={activeItem !== null}
        onClose={() => setActiveItem(null)}
        onAddToCart={(item, variant, quantity, source) => launchFlight(item, variant, quantity, source, false)}
        onOrderNow={(item, variant, quantity, source) => launchFlight(item, variant, quantity, source, true)}
      />

      {flight && (
        <FlyingCartAnimation
          uri={flight.uri}
          source={flight.source}
          target={flight.target}
          onComplete={handleFlightComplete}
        />
      )}
    </View>
  );
}