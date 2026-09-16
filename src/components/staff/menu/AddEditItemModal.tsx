import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category, MenuItem, Subcategory } from "../../../types/menu";
import DeleteConfirmModal from "./DeleteConfirmModal";

export type ItemFormValues = {
  name: string;
  description: string;
  categoryId: string | null;
  price: number | null;
  unitLabel: string | null;
  available: boolean;
  isSpecial: boolean;
  imageUri: string | null;
  existingImageUrl: string | null;
  variants: { label: string; price: number }[];
  subcategoryId: string | null;
  carriesOverStock: boolean;
};

type VariantRow = { label: string; price: string };

export default function AddEditItemModal({
  visible,
  mode,
  initialValues,
  categories,
  subcategories,
  onClose,
  onSave,
  onAddCategory,
  onAddSubcategory,
  onDeleteCategory,
  onDeleteSubcategory,
  saving,
}: {
  visible: boolean;
  mode: "add" | "edit";
  initialValues?: MenuItem;
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
  onSave: (values: ItemFormValues) => void;
  onAddCategory: (name: string) => Promise<Category>;
  onAddSubcategory: (categoryId: string, name: string) => Promise<Subcategory>;
  onDeleteCategory: (id: string) => Promise<void>;
  onDeleteSubcategory: (id: string) => Promise<void>;
  saving?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [available, setAvailable] = useState(true);
  const [isSpecial, setIsSpecial] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);

  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [addSubcategoryLoading, setAddSubcategoryLoading] = useState(false);

  const [hasVariants, setHasVariants] = useState(false);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([{ label: "", price: "" }]);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "category" | "subcategory"; id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [carriesOverStock, setCarriesOverStock] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && initialValues) {
        setName(initialValues.name);
        setDescription(initialValues.description ?? "");
        setCategoryId(initialValues.categoryId);
        setSubcategoryId(initialValues.subcategoryId);
        setUnitLabel(initialValues.unitLabel ?? "");
        setAvailable(initialValues.available);
        setIsSpecial(initialValues.isSpecial);
        setExistingImageUrl(initialValues.imageUrl);
        setCarriesOverStock(initialValues.carriesOverStock);

        if (initialValues.variants.length > 0) {
          setHasVariants(true);
          setVariantRows(
            initialValues.variants.map((v) => ({ label: v.label, price: String(v.price) }))
          );
          setPrice("");
        } else {
          setHasVariants(false);
          setVariantRows([{ label: "", price: "" }]);
          setPrice(initialValues.price !== null ? String(initialValues.price) : "");
        }
      } else {
        setName("");
        setDescription("");
        setCategoryId(categories[0]?.id ?? null);
        setSubcategoryId(null);
        setPrice("");
        setUnitLabel("");
        setAvailable(true);
        setIsSpecial(false);
        setExistingImageUrl(null);
        setHasVariants(false);
        setVariantRows([{ label: "", price: "" }]);
        setCarriesOverStock(false);
      }
      setImageUri(null);
      setError("");
      setAddingCategory(false);
      setNewCategoryName("");
      setAddingSubcategory(false);
      setNewSubcategoryName("");
    }
  }, [visible, mode, initialValues, categories]);

  // If the selected category changes to one that doesn't contain the
  // currently selected subcategory, clear it - a Type must belong to the
  // currently selected Category.
  useEffect(() => {
    if (subcategoryId) {
      const stillValid = subcategories.some(
        (s) => s.id === subcategoryId && s.categoryId === categoryId
      );
      if (!stillValid) setSubcategoryId(null);
    }
  }, [categoryId]);

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setAddCategoryLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
      );
      const newCat = await Promise.race([onAddCategory(trimmed), timeout]);
      setCategoryId(newCat.id);
      setAddingCategory(false);
      setNewCategoryName("");
    } catch (e: any) {
      setError(e.message ?? "Couldn't add category.");
    } finally {
      setAddCategoryLoading(false);
    }
  };

  const handleAddSubcategory = async () => {
    const trimmed = newSubcategoryName.trim();
    if (!trimmed || !categoryId) return;
    setAddSubcategoryLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
      );
      const newSub = await Promise.race([onAddSubcategory(categoryId, trimmed), timeout]);
      setSubcategoryId(newSub.id);
      setAddingSubcategory(false);
      setNewSubcategoryName("");
    } catch (e: any) {
      setError(e.message ?? "Couldn't add type.");
    } finally {
      setAddSubcategoryLoading(false);
    }
  };

  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      if (pendingDelete.kind === "category") {
        await onDeleteCategory(pendingDelete.id);
        if (categoryId === pendingDelete.id) setCategoryId(null);
      } else {
        await onDeleteSubcategory(pendingDelete.id);
        if (subcategoryId === pendingDelete.id) setSubcategoryId(null);
      }
      setPendingDelete(null);
    } catch (e: any) {
      setError(e.message ?? "Couldn't delete.");
      setPendingDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to add an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const updateVariantRow = (index: number, field: "label" | "price", value: string) => {
    setVariantRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addVariantRow = () => {
    setVariantRows((prev) => [...prev, { label: "", price: "" }]);
  };

  const removeVariantRow = (index: number) => {
    setVariantRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Item name is required.");
      return;
    }
    if (!categoryId) {
      setError("Select a category.");
      return;
    }

    if (hasVariants) {
      const cleanedVariants = variantRows
        .map((v) => ({ label: v.label.trim(), price: parseFloat(v.price) }))
        .filter((v) => v.label);

      if (cleanedVariants.length === 0) {
        setError("Add at least one size/option.");
        return;
      }
      if (cleanedVariants.some((v) => isNaN(v.price) || v.price <= 0)) {
        setError("Every size needs a valid price.");
        return;
      }

      onSave({
        name: name.trim(),
        description: description.trim() || "",
        categoryId,
        subcategoryId,
        price: null,
        unitLabel: null,
        available,
        isSpecial,
        imageUri,
        existingImageUrl,
        variants: cleanedVariants,
        carriesOverStock,
      });
    } else {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        setError("Enter a valid price.");
        return;
      }
      onSave({
        name: name.trim(),
        description: description.trim() || "",
        categoryId,
        subcategoryId,
        price: parsedPrice,
        unitLabel: unitLabel.trim() || null,
        available,
        isSpecial,
        imageUri,
        existingImageUrl,
        variants: [],
        carriesOverStock,
      });
    }
  };

  const previewUri = imageUri ?? existingImageUrl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable className="flex-1 bg-black/40" onPress={onClose} />

        <View
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl px-5 pt-3 max-h-[88%]"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        >
          <View className="w-10 h-1.5 rounded-full bg-border self-center mb-4" />

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-text text-lg font-bold">
              {mode === "add" ? "Add Menu Item" : "Edit Menu Item"}
            </Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons name="close" size={22} color="#666" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Image picker */}
            <Text className="text-text font-medium mb-1.5 text-sm">Photo</Text>
            <Pressable
              onPress={pickImage}
              className="border border-border border-dashed rounded-xl h-32 items-center justify-center mb-4 overflow-hidden"
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={24} color="#999" />
                  <Text className="text-text opacity-50 text-xs mt-1">Tap to add a photo</Text>
                </>
              )}
            </Pressable>

            <Text className="text-text font-medium mb-1.5 text-sm">Item Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Coke, Chicken Adobo Rice"
              placeholderTextColor="#999"
              className="border border-border rounded-xl px-4 py-3 mb-4 text-text"
            />

            <Text className="text-text font-medium mb-1.5 text-sm">Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Served with rice and gravy"
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              className="border border-border rounded-xl px-4 py-3 mb-4 text-text"
              style={{ textAlignVertical: "top", minHeight: 60 }}
            />

            <Text className="text-text font-medium mb-1.5 text-sm">Category</Text>
            <Text className="text-text opacity-40 text-[11px] mb-1.5">Hold a chip to delete it</Text>
            <View className="flex-row flex-wrap mb-2">
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  onLongPress={() => setPendingDelete({ kind: "category", id: cat.id, name: cat.name })}
                  delayLongPress={400}
                  className={`px-3 py-2 rounded-full border mr-2 mb-2 ${categoryId === cat.id ? "bg-primary border-primary" : "border-border bg-transparent"
                    }`}
                >
                  <Text
                    className={`text-xs font-medium ${categoryId === cat.id ? "text-white" : "text-text"
                      }`}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
              {!addingCategory && (
                <Pressable
                  onPress={() => setAddingCategory(true)}
                  className="flex-row items-center px-3 py-2 rounded-full border border-dashed border-primary mr-2 mb-2"
                >
                  <Ionicons name="add" size={14} color="#800020" />
                  <Text className="text-primary text-xs font-medium ml-1">Add category</Text>
                </Pressable>
              )}
            </View>

            {addingCategory && (
              <View className="flex-row items-center mb-4">
                <TextInput
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g. Combo Meal"
                  placeholderTextColor="#999"
                  autoFocus
                  className="flex-1 border border-border rounded-xl px-4 py-2.5 text-text mr-2"
                />
                <Pressable
                  onPress={handleAddCategory}
                  disabled={addCategoryLoading}
                  className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-2"
                >
                  {addCategoryLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAddingCategory(false);
                    setNewCategoryName("");
                  }}
                  className="w-10 h-10 rounded-full border border-border items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#666" />
                </Pressable>
              </View>
            )}

            {/* Type (subcategory) - only shown once a category is selected */}
            {categoryId && (
              <>
                <Text className="text-text font-medium mb-1.5 text-sm">Type (optional)</Text>
                <View className="flex-row flex-wrap mb-2">
                  {subcategories
                    .filter((s) => s.categoryId === categoryId)
                    .map((sub) => (
                      <Pressable
                        key={sub.id}
                        onPress={() =>
                          setSubcategoryId(subcategoryId === sub.id ? null : sub.id)
                        }
                        onLongPress={() =>
                          setPendingDelete({ kind: "subcategory", id: sub.id, name: sub.name })
                        }
                        delayLongPress={400}
                        className={`px-3 py-2 rounded-full border mr-2 mb-2 ${subcategoryId === sub.id
                          ? "bg-primary border-primary"
                          : "border-border bg-transparent"
                          }`}
                      >
                        <Text
                          className={`text-xs font-medium ${subcategoryId === sub.id ? "text-white" : "text-text"
                            }`}
                        >
                          {sub.name}
                        </Text>
                      </Pressable>
                    ))}
                  {!addingSubcategory && (
                    <Pressable
                      onPress={() => setAddingSubcategory(true)}
                      className="flex-row items-center px-3 py-2 rounded-full border border-dashed border-primary mr-2 mb-2"
                    >
                      <Ionicons name="add" size={14} color="#800020" />
                      <Text className="text-primary text-xs font-medium ml-1">Add type</Text>
                    </Pressable>
                  )}
                </View>

                {addingSubcategory && (
                  <View className="flex-row items-center mb-4">
                    <TextInput
                      value={newSubcategoryName}
                      onChangeText={setNewSubcategoryName}
                      placeholder="e.g. Soft Drinks, Water"
                      placeholderTextColor="#999"
                      autoFocus
                      className="flex-1 border border-border rounded-xl px-4 py-2.5 text-text mr-2"
                    />
                    <Pressable
                      onPress={handleAddSubcategory}
                      disabled={addSubcategoryLoading}
                      className="w-10 h-10 rounded-full bg-primary items-center justify-center mr-2"
                    >
                      {addSubcategoryLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setAddingSubcategory(false);
                        setNewSubcategoryName("");
                      }}
                      className="w-10 h-10 rounded-full border border-border items-center justify-center"
                    >
                      <Ionicons name="close" size={18} color="#666" />
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {/* Variants toggle */}
            <View className="flex-row items-center justify-between mb-3 mt-1 pt-3 border-t border-border">
              <View className="flex-1 pr-3">
                <Text className="text-text font-medium text-sm">Has sizes / options</Text>
                <Text className="text-text opacity-50 text-xs">
                  Turn on for drinks with sizes (Sakto, 8oz, Liter...) instead of one price
                </Text>
              </View>
              <Switch
                value={hasVariants}
                onValueChange={setHasVariants}
                trackColor={{ false: "#D1D5DB", true: "#800020" }}
                thumbColor="#fff"
              />
            </View>

            {hasVariants ? (
              <View className="mb-4">
                {variantRows.map((row, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <TextInput
                      value={row.label}
                      onChangeText={(v) => updateVariantRow(index, "label", v)}
                      placeholder="e.g. Sakto, 8oz, Small"
                      placeholderTextColor="#999"
                      className="flex-1 border border-border rounded-xl px-3 py-2.5 text-text mr-2"
                    />
                    <TextInput
                      value={row.price}
                      onChangeText={(v) => updateVariantRow(index, "price", v)}
                      placeholder="₱0.00"
                      placeholderTextColor="#999"
                      keyboardType="decimal-pad"
                      className="w-24 border border-border rounded-xl px-3 py-2.5 text-text mr-2"
                    />
                    <Pressable
                      hitSlop={8}
                      onPress={() => removeVariantRow(index)}
                      disabled={variantRows.length === 1}
                      style={{ opacity: variantRows.length === 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={addVariantRow}
                  className="flex-row items-center justify-center border border-dashed border-primary rounded-xl py-2.5 mt-1"
                >
                  <Ionicons name="add" size={16} color="#800020" />
                  <Text className="text-primary text-sm font-medium ml-1">Add another size</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="text-text font-medium mb-1.5 text-sm">Price (₱)</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  className="border border-border rounded-xl px-4 py-3 mb-4 text-text"
                />

                <Text className="text-text font-medium mb-1.5 text-sm">Unit label (optional)</Text>
                <TextInput
                  value={unitLabel}
                  onChangeText={setUnitLabel}
                  placeholder="e.g. per order, per pc, per cup"
                  placeholderTextColor="#999"
                  className="border border-border rounded-xl px-4 py-3 mb-4 text-text"
                />
              </>
            )}

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text font-medium text-sm">Available</Text>
              <Switch
                value={available}
                onValueChange={setAvailable}
                trackColor={{ false: "#D1D5DB", true: "#800020" }}
                thumbColor="#fff"
              />
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-text font-medium text-sm">Today's Special</Text>
                <Text className="text-text opacity-50 text-xs">Feature this item to students</Text>
              </View>
              <Switch
                value={isSpecial}
                onValueChange={setIsSpecial}
                trackColor={{ false: "#D1D5DB", true: "#D97706" }}
                thumbColor="#fff"
              />
            </View>

            <View className="flex-row items-center justify-between mb-2 pt-3 border-t border-border">
              <View className="flex-1 pr-3">
                <Text className="text-text font-medium text-sm">Ongoing Stock</Text>
                <Text className="text-text opacity-50 text-xs">
                  For non-perishables (drinks, snacks) -- leftover stock carries to the next day. Leave
                  off for cooked/perishable food, which resets daily.
                </Text>
              </View>
              <Switch
                value={carriesOverStock}
                onValueChange={setCarriesOverStock}
                trackColor={{ false: "#D1D5DB", true: "#800020" }}
                thumbColor="#fff"
              />
            </View>

            {error ? <Text className="text-danger text-sm mt-2">{error}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="bg-primary rounded-xl py-3.5 items-center mt-4"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              <Text className="text-white font-bold text-base">
                {saving ? "Saving..." : mode === "add" ? "Add Item" : "Save Changes"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DeleteConfirmModal
        visible={!!pendingDelete}
        title={pendingDelete?.kind === "category" ? "Delete Category?" : "Delete Type?"}
        itemName={pendingDelete?.name ?? ""}
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed. Items using it will become un${pendingDelete.kind === "category" ? "categorized" : "typed"
            }, not deleted.`
            : undefined
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmPendingDelete}
      />
    </Modal>
  );
}