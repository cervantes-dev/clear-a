import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FlyingCartAnimation from "../../components/student/menu/FlyingCartAnimation";
import ItemDetailModal from "../../components/student/menu/ItemDetailModal";
import MenuGridCard from "../../components/student/menu/MenuGridCard";
import { useStudentMenu } from "../../hooks/useStudentMenu";
import { useCartStore } from "../../store/cartStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { MenuItem, MenuItemVariant } from "../../types/menu";

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

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { menuItems, stockMap, loading, refreshing, refresh } = useStudentMenu();
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [flight, setFlight] = useState<FlightState | null>(null);

  const cartIconRef = useRef<View>(null);
  const pendingCommitRef = useRef<PendingCommit | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const itemCount = useCartStore((state) => state.itemCount());

  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const favoriteItems = menuItems.filter((item) => favoriteIds.has(item.id));

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

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View
        className="bg-primary px-5 pb-8 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View>
          <Text className="text-white text-2xl font-bold">Favorites</Text>
          <Text className="text-white/80 text-sm mt-1">Your saved items</Text>
        </View>

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

      <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-text opacity-50">Loading...</Text>
          </View>
        ) : favoriteItems.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
            <Text className="text-text opacity-50 text-center mt-3">
              No favorites yet. Tap the heart on any menu item to save it here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          >
            <View className="flex-row flex-wrap justify-between">
              {favoriteItems.map((item) => (
                <View key={item.id} className="mb-3">
                  <MenuGridCard
                    item={item}
                    stockRemaining={stockMap[item.id]?.remainingQuantity ?? null}
                    onPress={openDetail}
                    isFavorite={true}
                    onToggleFavorite={(i) => toggleFavorite(i.id)}
                  />
                </View>
              ))}
            </View>
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