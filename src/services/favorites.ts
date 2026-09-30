import { supabase } from "./supabase";

export async function getFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from("favorites").select("item_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.item_id);
}

export async function addFavorite(itemId: string): Promise<void> {
  // getSession() reads the locally stored session -- no network round trip,
  // unlike getUser() which hits the auth server on every call. RLS on the
  // favorites table still enforces that user_id must equal auth.uid().
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not authenticated");

  // Idempotent add: if the row already exists (stale local state, double tap,
  // another device), ignore the duplicate instead of throwing 23505.
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: userId, item_id: itemId },
      { onConflict: "user_id,item_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function removeFavorite(itemId: string): Promise<void> {
  const { error } = await supabase.from("favorites").delete().eq("item_id", itemId);
  if (error) throw error;
}