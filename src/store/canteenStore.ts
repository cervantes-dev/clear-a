import { create } from "zustand";
import { CanteenStatus, getCanteenStatus } from "../services/canteen";

interface CanteenState {
  /** null until the first load; screens treat null as "open" (the server enforces it anyway). */
  status: CanteenStatus | null;
  // Resolves true when loaded (or superseded by a newer load / a reset),
  // false when the fetch failed so the caller can retry.
  load: () => Promise<boolean>;
  reset: () => void;
}

// Bumped on every load and reset, so a slow response from a previous load (or
// a previous account) can't overwrite newer state.
let loadSeq = 0;

export const useCanteenStore = create<CanteenState>((set) => ({
  status: null,

  load: async () => {
    const seq = ++loadSeq;
    try {
      const status = await getCanteenStatus();
      if (seq !== loadSeq) return true;
      set({ status });
      return true;
    } catch (err) {
      if (seq !== loadSeq) return true;
      // Keep the last known status: a failed refresh shouldn't flip the UI.
      console.error("Failed to load canteen status:", err);
      return false;
    }
  },

  reset: () => {
    loadSeq++;
    set({ status: null });
  },
}));