// Manila is UTC+8 year-round (the Philippines has no daylight saving), so a
// fixed offset is exact. Everything that asks "what day is it?" must go
// through here -- never `new Date().toISOString()`, which is UTC and rolls
// the date over at 8:00 AM Manila time, disagreeing with the database.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** YYYY-MM-DD for the given instant, as a calendar date in Manila. */
export function manilaDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().split("T")[0];
}

/** Today's date in Manila, YYYY-MM-DD. Matches Postgres `current_date`. */
export function todayManila(): string {
  return manilaDateString();
}

/** The last `count` Manila dates ending today, oldest first, as YYYY-MM-DD. */
export function lastManilaDays(count: number): string[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) =>
    manilaDateString(new Date(now - (count - 1 - i) * 24 * 60 * 60 * 1000))
  );
}

/** Short weekday label ("Mon") for a YYYY-MM-DD string, independent of the phone's timezone. */
export function weekdayShort(dateStr: string): string {
  // Noon UTC can't flip to an adjacent day in any timezone.
  return new Date(`${dateStr}T12:00:00Z`)
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    .slice(0, 3);
}