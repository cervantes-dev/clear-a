import { todayManila } from "../utils/date";
import { supabase } from "./supabase";

export type ClosedReason = "manual" | "closed_day" | "before_open" | "after_close";

export type CanteenStatus = {
  isOpen: boolean;
  reason: ClosedReason | null;
  /** ISO timestamp of the next moment ordering opens, null if none is scheduled. */
  nextOpenAt: string | null;
  /** "HH:MM", 24-hour, Manila time. */
  openTime: string;
  closeTime: string;
};

/** Asks the database -- its clock, not the phone's -- whether the canteen is open. */
export async function getCanteenStatus(): Promise<CanteenStatus> {
  const { data, error } = await supabase.rpc("get_canteen_status");
  if (error) throw error;

  return {
    isOpen: !!data.is_open,
    reason: data.reason ?? null,
    nextOpenAt: data.next_open_at ?? null,
    openTime: data.open_time,
    closeTime: data.close_time,
  };
}

/** Staff-only: close the canteen for today (it reopens by itself tomorrow), or undo that. */
export async function setClosedToday(closed: boolean): Promise<void> {
  const { error } = await supabase
    .from("canteen_settings")
    .update({ closed_on: closed ? todayManila() : null })
    .eq("id", true);
  if (error) throw error;
}