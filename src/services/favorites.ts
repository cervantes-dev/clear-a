import { supabase } from "./supabase";

export async function getFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from("favorites").select("item_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.item_id);
}

export async function addFavorite(itemId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase.from("favorites").insert({ user_id: userId, item_id: itemId });
  if (error) throw error;
}

export async function removeFavorite(itemId: string): Promise<void> {
  const { error } = await supabase.from("favorites").delete().eq("item_id", itemId);
  if (error) throw error;
}