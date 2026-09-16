import AddEditItemModal, { ItemFormValues } from "@/components/staff/menu/AddEditItemModal";
import CategoryFilterBar from "@/components/staff/menu/CategoryFilterBar";
import DeleteConfirmModal from "@/components/staff/menu/DeleteConfirmModal";
import ItemActionsSheet from "@/components/staff/menu/ItemActionsSheet";
import MenuItemCard from "@/components/staff/menu/MenuItemCard";
import MenuListSkeleton from "@/components/staff/menu/MenuListSkeleton";
import StaffHeaderAvatar from "@/components/staff/StaffHeaderAvatar";
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
  setSpecial,
  updateMenuItem,
  uploadMenuImage,
} from "@/services/menu";
import { Category, MenuItem, Subcategory } from "@/types/menu";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_CLEARANCE = 64 + 40 + 24;

export default function ManageMenu() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const [actionsTarget, setActionsTarget] = useState<MenuItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const loadData = async () => {
    try {
      const [cats, subs, menuItems] = await Promise.all([
        getCategories(),
        getSubcategories(),
        getMenuItems(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
      setItems(menuItems);
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

  const toggleSpecial = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const next = !target.isSpecial;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isSpecial: next } : i)));
    try {
      await setSpecial(id, next);
    } catch (e: any) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isSpecial: !next } : i)));
      Alert.alert("Error", e.message ?? "Couldn't update special status.");
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

  const availableCount = items.filter((i) => i.available).length;

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />

      <View className="bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-white text-lg font-bold">Manage Menu</Text>
            <Text className="text-white/80 text-xs mt-0.5">
              {loading
                ? "Loading menu..."
                : `${items.length} item${items.length !== 1 ? "s" : ""} · ${availableCount} available`}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Pressable
              hitSlop={8}
              onPress={openAddModal}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-2"
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
            <StaffHeaderAvatar />
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 bg-background rounded-t-3xl" style={{ marginTop: -20, paddingTop: 20 }}>
          <MenuListSkeleton />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-background rounded-t-3xl"
          style={{ marginTop: -20 }}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
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

            {filteredItems.length === 0 ? (
              <View className="items-center py-12">
                <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Ionicons name="restaurant-outline" size={24} color="#800020" />
                </View>
                <Text className="text-text font-semibold text-sm text-center">
                  {items.length === 0 ? "No menu items yet" : "No items match your search"}
                </Text>
                <Text className="text-text opacity-50 text-xs text-center mt-1">
                  {items.length === 0
                    ? "Tap + to add your first item."
                    : "Try a different search or category."}
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onToggleAvailable={toggleAvailability}
                  onPress={setActionsTarget}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      <ItemActionsSheet
        item={actionsTarget}
        onClose={() => setActionsTarget(null)}
        onEdit={openEditModal}
        onToggleSpecial={toggleSpecial}
        onDelete={requestDelete}
      />

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
    </View>
  );
}