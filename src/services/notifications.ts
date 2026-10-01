import { supabase } from "./supabase";

// getSession() reads the locally stored session -- no network round trip.
// RLS still enforces that user_id must equal auth.uid().
async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function getDismissedIds(): Promise<string[]> {
  const { data, error } = await supabase.from("notification_dismissals").select("notification_id");
  if (error) throw error;
  return (data ?? []).map((row) => row.notification_id);
}

export async function addDismissal(notificationId: string): Promise<void> {
  const userId = await requireUserId();
  // Idempotent: dismissing the same notification twice (two devices, double
  // tap) is a no-op instead of a duplicate-key error.
  const { error } = await supabase
    .from("notification_dismissals")
    .upsert(
      { user_id: userId, notification_id: notificationId },
      { onConflict: "user_id,notification_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function getLastSeenAt(): Promise<string | null> {
  const { data, error } = await supabase.from("notification_state").select("last_seen_at").maybeSingle();
  if (error) throw error;
  return data?.last_seen_at ?? null;
}

export async function saveLastSeenAt(iso: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from("notification_state")
    .upsert({ user_id: userId, last_seen_at: iso }, { onConflict: "user_id" });
  if (error) throw error;
}