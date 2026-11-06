import { CanteenStatus } from "../services/canteen";
import { manilaDateString, todayManila, weekdayShort } from "./date";

/** "08:00" -> "8:00 AM", "17:00" -> "5:00 PM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "today at 8:00 AM", "tomorrow at 8:00 AM" or "Mon at 8:00 AM", in Manila time. */
export function formatNextOpen(status: CanteenStatus): string | null {
  if (!status.nextOpenAt) return null;

  const openDate = manilaDateString(new Date(status.nextOpenAt));
  const tomorrow = manilaDateString(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const time = formatClock(status.openTime);

  if (openDate === todayManila()) return `today at ${time}`;
  if (openDate === tomorrow) return `tomorrow at ${time}`;
  return `${weekdayShort(openDate)} at ${time}`;
}

/** Student-facing wording for why the canteen is closed. */
export function describeClosure(status: CanteenStatus): { title: string; subtitle: string } {
  const next = formatNextOpen(status);

  switch (status.reason) {
    case "manual":
      return {
        title: "The canteen is closed today",
        subtitle: next ? `Ordering opens again ${next}.` : "Ordering is paused for now.",
      };
    case "closed_day":
      return {
        title: "The canteen is closed today",
        subtitle: next ? `Ordering opens ${next}.` : "No opening day is scheduled.",
      };
    case "before_open":
      return {
        title: `The canteen opens at ${formatClock(status.openTime)}`,
        subtitle: "You can browse the menu and fill your cart meanwhile.",
      };
    case "after_close":
    default:
      return {
        title: "The canteen is closed for the day",
        subtitle: next ? `Ordering opens again ${next}.` : "Ordering is closed.",
      };
  }
}