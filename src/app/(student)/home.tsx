import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CategoryFilterBar from "../../components/staff/menu/CategoryFilterBar";
import ActiveOrderCard from "../../components/student/home/ActiveOrderCard";
import HomeMenuCard from "../../components/student/home/HomeMenuCard";
import HomeMenuListItem from "../../components/student/home/HomeMenuListItem";
import PickupInfoModal from "../../components/student/home/PickupInfoModal";
import QuickActionButton from "../../components/student/home/QuickActionButton";
import SloganCard from "../../components/student/home/SloganCard";
import FlyingCartAnimation from "../../components/student/menu/FlyingCartAnimation";
import ItemDetailModal from "../../components/student/menu/ItemDetailModal";
import TodaySpecialSkeleton from "../../components/student/skeleton/TodaySpecialSkeleton";
import { useMyOrders } from "../../hooks/useMyOrders";
import { useStudentMenu } from "../../hooks/useStudentMenu";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useFavoritesStore } from "../../store/favoritesStore";
import { MenuItem, MenuItemVariant } from "../../types/menu";

const ACTIVE_STATUSES = ["pending", "preparing", "ready"];
const TAB_BAR_CLEARANCE = 64 + 40 + 24;

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

function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (first.length === 0) return "";
  return first[0].toUpperCase() + first.slice(1).toLowerCase();
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function StudentHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const { menuItems, categories, stockMap, loading, refreshing, error, refresh } = useStudentMenu();
  const { orders: myOrders } = useMyOrders();

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [flight, setFlight] = useState<FlightState | null>(null);
  const [pickupInfoVisible, setPickupInfoVisible] = useState(false);
  const [menuSectionY, setMenuSectionY] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const cartIconRef = useRef<View>(null);
  const pendingCommitRef = useRef<PendingCommit | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const itemCount = useCartStore((state) => state.itemCount());

  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);

  const firstName = user ? getFirstName(user.name) : "";
  const avatarInitial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  const activeOrder = [...myOrders]
    .filter((o) => ACTIVE_STATUSES.includes(o.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const specials = menuItems.filter((i) => i.isSpecial && i.available);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = selectedCategoryId === null || item.categoryId === selectedCategoryId;
      return item.available && matchesSearch && matchesCategory;
    });
  }, [menuItems, search, selectedCategoryId]);

  const openDetail = (item: MenuItem) => setActiveItem(item);

  const scrollToMenu = () => {
    scrollViewRef.current?.scrollTo({ y: menuSectionY, animated: true });
  };

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

  // Quick "Add" tap: items with variants can't be safely added without
  // knowing which size/price, so open the detail modal instead of guessing.
  const handleQuickAdd = (item: MenuItem) => {
    if (item.variants.length > 0) {
      openDetail(item);
      return;
    }
    addItem(item, null, 1);
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View
          className="flex-row items-center justify-between px-5"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View>
            <Text className="text-text opacity-50 text-sm">{getGreeting()},</Text>
            <Text className="text-text text-2xl font-bold">{firstName || "there"} 👋</Text>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-card border border-border items-center justify-center mr-2"
              onPress={() => {}}
            >
              <Ionicons name="notifications-outline" size={22} color="#800020" />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-danger" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(student)/profile")}
              className="w-11 h-11 rounded-full bg-primary/10 border border-border items-center justify-center"
            >
              <Text className="text-primary font-bold text-base">{avatarInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SloganCard onPress={scrollToMenu} />

        {/* Search + cart */}
        <View className="flex-row items-center px-5 mt-4">
          <View className="flex-1 flex-row items-center bg-card border border-border rounded-full px-4 py-2.5 mr-2">
            <Ionicons name="search-outline" size={18} color="#999" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Find your favorite food"
              placeholderTextColor="#999"
              className="flex-1 ml-2 text-text text-sm"
            />
          </View>

          <View ref={cartIconRef} collapsable={false}>
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-card border border-border items-center justify-center"
              onPress={() => router.push("/(student)/cart")}
            >
              <Ionicons name="cart-outline" size={20} color="#800020" />
              {itemCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {activeOrder && <ActiveOrderCard order={activeOrder} />}

        <View className="mt-6">
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-lg font-bold text-text">Today's Specials</Text>
            <TouchableOpacity onPress={scrollToMenu}>
              <Text className="text-primary text-sm font-semibold">See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <TodaySpecialSkeleton />
          ) : specials.length === 0 ? (
            <Text className="text-text opacity-50 text-center px-5">No specials today. Check back soon!</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {specials.map((item) => (
                <HomeMenuCard
                  key={item.id}
                  item={item}
                  stockRemaining={stockMap[item.id]?.remainingQuantity ?? null}
                  isFavorite={favoriteIds.has(item.id)}
                  onPress={openDetail}
                  onToggleFavorite={(i) => toggleFavorite(i.id)}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mt-6 px-5">
          <Text className="text-lg font-bold text-text mb-3">Quick Actions</Text>

          <View className="flex-row justify-between">
            <QuickActionButton label="Browse Menu" icon="restaurant-outline" onPress={scrollToMenu} />
            <QuickActionButton
              label="My Orders"
              icon="receipt-outline"
              onPress={() => router.push("/(student)/orders")}
            />
            <QuickActionButton
              label="Favorites"
              icon="heart-outline"
              onPress={() => router.push("/(student)/favorites")}
            />
            <QuickActionButton
              label="Pickup Info"
              icon="information-circle-outline"
              onPress={() => setPickupInfoVisible(true)}
            />
          </View>
        </View>

        {/* Placeholder cut-off time -- real per-day cut-off logic isn't
            built yet (tracked as one of the four Control Features). */}
        <View className="flex-row items-center bg-amber-50 border border-amber-200 rounded-2xl mx-5 mt-6 px-4 py-3.5">
          <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mr-3">
            <Ionicons name="alarm-outline" size={18} color="#D97706" />
          </View>
          <View className="flex-1">
            <Text className="text-text font-bold text-sm">Ordering Cut-off</Text>
            <Text className="text-text opacity-60 text-xs mt-0.5">
              You can place orders until 9:45 AM for today's recess.
            </Text>
          </View>
        </View>

        <View className="px-5 mt-6">
          <Text className="text-lg font-bold text-text mb-3">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <CategoryFilterBar
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </ScrollView>
        </View>

        <View className="px-5" onLayout={(e) => setMenuSectionY(e.nativeEvent.layout.y)}>
          <Text className="text-lg font-bold text-text mb-3">Menu</Text>

          {loading ? (
            <TodaySpecialSkeleton />
          ) : error ? (
            <Text className="text-text opacity-60 text-center py-6">{error}</Text>
          ) : filteredItems.length === 0 ? (
            <Text className="text-text opacity-50 text-center py-6">
              {search.trim() ? "No items match your search." : "No items available right now."}
            </Text>
          ) : (
            filteredItems.map((item) => (
              <HomeMenuListItem
                key={item.id}
                item={item}
                stockRemaining={stockMap[item.id]?.remainingQuantity ?? null}
                isFavorite={favoriteIds.has(item.id)}
                onPress={openDetail}
                onToggleFavorite={(i) => toggleFavorite(i.id)}
                onQuickAdd={handleQuickAdd}
              />
            ))
          )}
        </View>
      </ScrollView>

      <ItemDetailModal
        item={activeItem}
        stockRemaining={activeItem ? stockMap[activeItem.id]?.remainingQuantity ?? null : null}
        visible={activeItem !== null}
        onClose={() => setActiveItem(null)}
        onAddToCart={(item, variant, quantity, source) => launchFlight(item, variant, quantity, source, false)}
        onOrderNow={(item, variant, quantity, source) => launchFlight(item, variant, quantity, source, true)}
      />

      <PickupInfoModal visible={pickupInfoVisible} onClose={() => setPickupInfoVisible(false)} />

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