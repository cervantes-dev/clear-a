import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system";
import { Category, MenuItem, MenuItemInput, Subcategory } from "../types/menu";
import { supabase } from "./supabase";

// ---- Categories ----

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function addCategory(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select()
    .single();

  if (error) throw error;

  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

// ---- Subcategories ("Type", scoped to a category) ----

export async function getSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from("subcategories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function addSubcategory(categoryId: string, name: string): Promise<Subcategory> {
  const { data, error } = await supabase
    .from("subcategories")
    .insert({ category_id: categoryId, name })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    categoryId: data.category_id,
    name: data.name,
    createdAt: data.created_at,
  };
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await supabase.from("subcategories").delete().eq("id", id);
  if (error) throw error;
}

// ---- Menu items ----

function mapMenuItemRow(row: any): MenuItem {
  const variants = (row.menu_item_variants ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((v: any) => ({
      id: v.id,
      label: v.label,
      price: Number(v.price),
      sortOrder: v.sort_order,
    }));

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.categories?.name ?? null,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategories?.name ?? null,
    price: row.price !== null ? Number(row.price) : null,
    unitLabel: row.unit_label,
    available: row.available,
    isSpecial: row.is_special,
    imageUrl: row.image_url,
    variants,
    carriesOverStock: row.carries_over_stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MENU_ITEM_SELECT = "*, categories(name), subcategories(name), menu_item_variants(*)";

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map(mapMenuItemRow);
}

async function replaceVariants(menuItemId: string, variants: { label: string; price: number }[]) {
  // Simplest correct approach for a short list like sizes: wipe and re-insert,
  // rather than diffing existing rows. Fine at this scale (a handful of
  // variants per item); would need real diffing if variant lists grew large.
  const { error: deleteError } = await supabase
    .from("menu_item_variants")
    .delete()
    .eq("menu_item_id", menuItemId);
  if (deleteError) throw deleteError;

  if (variants.length === 0) return;

  const rows = variants.map((v, index) => ({
    menu_item_id: menuItemId,
    label: v.label,
    price: v.price,
    sort_order: index,
  }));

  const { error: insertError } = await supabase.from("menu_item_variants").insert(rows);
  if (insertError) throw insertError;
}

export async function addMenuItem(input: MenuItemInput): Promise<MenuItem> {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      price: input.price,
      unit_label: input.unitLabel,
      available: input.available,
      is_special: input.isSpecial,
      image_url: input.imageUrl,
      carries_over_stock: input.carriesOverStock,
    })
    .select()
    .single();

  if (error) throw error;

  if (input.variants.length > 0) {
    await replaceVariants(data.id, input.variants);
  }

  const { data: full, error: fetchError } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .eq("id", data.id)
    .single();

  if (fetchError) throw fetchError;

  return mapMenuItemRow(full);
}

export async function updateMenuItem(id: string, input: MenuItemInput): Promise<MenuItem> {
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      price: input.price,
      unit_label: input.unitLabel,
      available: input.available,
      is_special: input.isSpecial,
      image_url: input.imageUrl,
      carries_over_stock: input.carriesOverStock,
    })
    .eq("id", id);

  if (error) throw error;

  await replaceVariants(id, input.variants);

  const { data: full, error: fetchError } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_SELECT)
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  return mapMenuItemRow(full);
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

export async function setAvailability(id: string, available: boolean): Promise<void> {
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", id);
  if (error) throw error;
}

export async function setSpecial(id: string, isSpecial: boolean): Promise<void> {
  const { error } = await supabase.from("menu_items").update({ is_special: isSpecial }).eq("id", id);
  if (error) throw error;
}

// ---- Image upload ----

/**
 * Uploads a local image (from expo-image-picker's result.assets[0].uri) to the
 * `menu-images` Supabase Storage bucket and returns its public URL.
 */
export async function uploadMenuImage(localUri: string): Promise<string> {
  const file = new File(localUri);
  const base64 = await file.base64();

  const fileExt = localUri.split(".").pop()?.toLowerCase() ?? "jpg";
  const filePath = `${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(filePath, decode(base64), {
      contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);
  return data.publicUrl;
}