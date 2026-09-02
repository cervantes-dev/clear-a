import AddEditItemModal, { ItemFormValues } from "@/components/staff/menu/AddEditItemModal";
import CategoryFilterBar from "@/components/staff/menu/CategoryFilterBar";
import DeleteConfirmModal from "@/components/staff/menu/DeleteConfirmModal";
import MenuItemCard from "@/components/staff/menu/MenuItemCard";
import SetStockModal from "@/components/staff/menu/SetStockModal";
import {
  addCategory,
  addMenuItem,
  addSubcategory,
  deleteCategory,
  deleteMenuItem,
  deleteSubcategory,
  getCategories,
  getMenuItems,
  getSubcategories,
  setAvailability,
  updateMenuItem,
  uploadMenuImage,
} from "@/services/menu";
import { clearTodaysStock, getTodaysStock, setTodaysStock } from "@/services/order";
import { Category, MenuItem, Subcategory } from "@/types/menu";
import { DailyStock } from "@/types/order";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ManageMenu() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, DailyStock>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const [stockTarget, setStockTarget] = useState<MenuItem | null>(null);
  const [stockSaving, setStockSaving] = useState(false);

  const loadData = async () => {
    try {
      const [cats, subs, menuItems, stock] = await Promise.all([
        getCategories(),
        getSubcategories(),
        getMenuItems(),
        getTodaysStock(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
      setItems(menuItems);
      setStockMap(stock);
    } catch (e: any) {
      Alert.alert("Error loading menu", e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleAvailability = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.available;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, available: next } : i)));
    try {
      await setAvailability(id, next);
    } catch (e: any) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, available: !next } : i)));
      Alert.alert("Error", e.message ?? "Couldn't update availability.");
    }
  };

  const openAddModal = () => {
    setFormMode("add");
    setEditingItem(undefined);
    setFormVisible(true);
  };

  const openEditModal = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setFormMode("edit");
    setEditingItem(item);
    setFormVisible(true);
  };

  const openStockModal = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setStockTarget(item);
  };

  const handleSetStock = async (quantity: number) => {
    if (!stockTarget) return;
    setStockSaving(true);
    try {
      await setTodaysStock(stockTarget.id, quantity);
      setStockMap((prev) => ({
        ...prev,
        [stockTarget.id]: {
          menuItemId: stockTarget.id,
          stockDate: new Date().toISOString().split("T")[0],
          initialQuantity: quantity,
          remainingQuantity: quantity,
        },
      }));
      setStockTarget(null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't update stock.");
    } finally {
      setStockSaving(false);
    }
  };

  const handleClearStock = async () => {
    if (!stockTarget) return;
    setStockSaving(true);
    try {
      await clearTodaysStock(stockTarget.id);
      setStockMap((prev) => {
        const next = { ...prev };
        delete next[stockTarget.id];
        return next;
      });
      setStockTarget(null);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't clear stock cap.");
    } finally {
      setStockSaving(false);
    }
  };

  const handleSaveItem = async (values: ItemFormValues) => {
    setSaving(true);
    try {
      let imageUrl = values.existingImageUrl;
      if (values.imageUri) {
        imageUrl = await uploadMenuImage(values.imageUri);
      }

      const input = {
        name: values.name,
        description: values.description || null,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId,
        price: values.price,
        unitLabel: values.unitLabel,
        available: values.available,
        isSpecial: values.isSpecial,
        imageUrl,
        variants: values.variants,
        carriesOverStock: values.carriesOverStock,
      };

      if (formMode === "add") {
        const newItem = await addMenuItem(input);
        setItems((prev) => [newItem, ...prev]);
      } else if (editingItem) {
        const updated = await updateMenuItem(editingItem.id, input);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }

      setFormVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (name: string) => {
    const newCat = await addCategory(name);
    setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
    return newCat;
  };

  const handleAddSubcategory = async (categoryId: string, name: string) => {
    const newSub = await addSubcategory(categoryId, name);
    setSubcategories((prev) => [...prev, newSub].sort((a, b) => a.name.localeCompare(b.name)));
    return newSub;
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setItems((prev) =>
      prev.map((i) => (i.categoryId === id ? { ...i, categoryId: null, categoryName: null } : i))
    );
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  const handleDeleteSubcategory = async (id: string) => {
    await deleteSubcategory(id);
    setSubcategories((prev) => prev.filter((s) => s.id !== id));
    setItems((prev) =>
      prev.map((i) =>
        i.subcategoryId === id ? { ...i, subcategoryId: null, subcategoryName: null } : i
      )
    );
  };

  const requestDelete = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Couldn't delete item.");
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategoryId === null || item.categoryId === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      {/* Plain rectangular header -- no rounded corners here, same pattern as Dashboard/Orders */}
      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-lg font-bold">Manage Menu</Text>
            <Text className="text-white/80 text-xs mt-0.5">Add, edit and manage your menu items</Text>
          </View>
          <Pressable
            hitSlop={8}
            onPress={openAddModal}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View
          className="flex-1 items-center justify-center bg-background rounded-t-3xl"
          style={{ marginTop: -20 }}
        >
          <ActivityIndicator size="large" color="#800020" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background rounded-t-3xl"
          style={{ marginTop: -20 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 24 }}
        >
          <View className="px-5">
            <View className="flex-row items-center bg-card border border-border rounded-full px-4 py-2.5 mb-4">
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search menu items..."
                placeholderTextColor="#999"
                className="flex-1 ml-2 text-text text-sm"
              />
            </View>

            <CategoryFilterBar
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />

            <Text className="text-text opacity-50 text-xs mb-3">
              {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            </Text>

            {filteredItems.length === 0 ? (
              <Text className="text-text opacity-50 text-sm text-center mt-8">
                No menu items yet. Tap + to add one.
              </Text>
            ) : (
              filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  stockRemaining={stockMap[item.id]?.remainingQuantity ?? null}
                  onToggle={toggleAvailability}
                  onEdit={openEditModal}
                  onDelete={requestDelete}
                  onSetStock={openStockModal}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <AddEditItemModal
        visible={formVisible}
        mode={formMode}
        initialValues={editingItem}
        categories={categories}
        subcategories={subcategories}
        saving={saving}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveItem}
        onAddCategory={handleAddCategory}
        onAddSubcategory={handleAddSubcategory}
        onDeleteCategory={handleDeleteCategory}
        onDeleteSubcategory={handleDeleteSubcategory}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        itemName={deleteTarget?.name ?? ""}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <SetStockModal
        visible={!!stockTarget}
        itemName={stockTarget?.name ?? ""}
        currentStock={stockTarget ? stockMap[stockTarget.id]?.remainingQuantity ?? null : null}
        saving={stockSaving}
        onClose={() => setStockTarget(null)}
        onSetStock={handleSetStock}
        onClearStock={handleClearStock}
      />
    </View>
  );
}