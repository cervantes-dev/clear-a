import { CartLine } from "../types/cart";
import { supabase } from "./supabase";

const CART_SELECT = "*, menu_items(name, image_url, price), menu_item_variants(label, price)";

function mapCartRow(row: any): CartLine {
  const variant = row.menu_item_variants;
  const menuItem = row.menu_items;
  const unitPrice = variant ? Number(variant.price) : Number(menuItem?.price ?? 0);

  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    menuItemName: menuItem?.name ?? "Unknown item",
    imageUrl: menuItem?.image_url ?? null,
    variantId: row.variant_id,
    variantLabel: variant?.label ?? null,
    unitPrice,
    quantity: row.quantity,
  };
}

export async function getCartItems(): Promise<CartLine[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(CART_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapCartRow);
}

/** Used by the realtime subscription to fetch a single row (with joins) after an INSERT/UPDATE from another device. */
export async function getCartItemById(id: string): Promise<CartLine> {
  const { data, error } = await supabase.from("cart_items").select(CART_SELECT).eq("id", id).single();
  if (error) throw error;
  return mapCartRow(data);
}

/**
 * Adds a quantity to the cart. If a row already exists for this exact
 * menu item + variant combination, its quantity is bumped instead of
 * creating a duplicate row -- done as a manual select-then-write rather
 * than a DB upsert, since variant_id is nullable and Supabase's .upsert()
 * can't target a partial unique index for the "no variant" case.
 */
export async function addToCart(
  menuItemId: string,
  variantId: string | null,
  quantity: number
): Promise<{ id: string; quantity: number }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  let existingQuery = supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("menu_item_id", menuItemId);
  existingQuery = variantId ? existingQuery.eq("variant_id", variantId) : existingQuery.is("variant_id", null);

  const { data: existing, error: selectError } = await existingQuery.maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", existing.id)
      .select("id, quantity")
      .single();
    if (error) throw error;
    return { id: data.id, quantity: data.quantity };
  }

  const { data, error } = await supabase
    .from("cart_items")
    .insert({ user_id: userId, menu_item_id: menuItemId, variant_id: variantId, quantity })
    .select("id, quantity")
    .single();
  if (error) throw error;
  return { id: data.id, quantity: data.quantity };
}

export async function setCartItemQuantity(id: string, quantity: number): Promise<void> {
  const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
  if (error) throw error;
}

export async function removeCartItem(id: string): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearCart(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}