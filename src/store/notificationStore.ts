import { create } from "zustand";
import {
  addDismissal,
  getDismissedIds,
  getLastSeenAt,
  saveLastSeenAt,
} from "../services/notifications";

interface NotificationState {
  lastSeenAt: string | null; // ISO timestamp -- notifications after this are "unread"
  // Notifications are derived from orders, not stored rows, so "deleting" one
  // records a dismissal (synced to the server) rather than touching order data.
  dismissedIds: Set<string>;
  loaded: boolean;
  // Resolves true when in sync with the server (or superseded by a newer
  // load), false when the fetch failed so the caller can retry.
  load: () => Promise<boolean>;
  markAllSeen: () => void;
  dismiss: (id: string) => void;
  reset: () => void;
}

// Bumped on every load and reset, so a slow response from a previous load (or
// a previous account) can't overwrite newer state.
let loadSeq = 0;

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  lastSeenAt: null,
  dismissedIds: new Set(),
  loaded: false,

  load: async () => {
    const seq = ++loadSeq;
    try {
      const [ids, serverSeenAt] = await Promise.all([getDismissedIds(), getLastSeenAt()]);
      if (seq !== loadSeq) return true;

      set((state) => {
        // Merge instead of replace: anything dismissed or seen locally while
        // this request was in flight must survive. Dismissals only ever get
        // added, so a union is always correct.
        const dismissedIds = new Set(ids);
        state.dismissedIds.forEach((id) => dismissedIds.add(id));
        return {
          dismissedIds,
          lastSeenAt: laterOf(state.lastSeenAt, serverSeenAt),
          loaded: true,
        };
      });
      return true;
    } catch (err) {
      if (seq !== loadSeq) return true;
      // Deliberately NOT marking loaded: a failed load must not look like
      // "nothing dismissed". The caller retries.
      console.error("Failed to load notification state:", err);
      return false;
    }
  },

  markAllSeen: () => {
    const now = new Date().toISOString();
    set({ lastSeenAt: now });
    saveLastSeenAt(now).catch((err) => {
      // Not worth reverting: worst case the badge reappears on other devices.
      console.error("Failed to save notification seen time:", err);
    });
  },

  dismiss: (id) => {
    if (get().dismissedIds.has(id)) return;

    set((state) => {
      const next = new Set(state.dismissedIds);
      next.add(id);
      return { dismissedIds: next };
    });

    addDismissal(id).catch((err) => {
      console.error("Failed to dismiss notification:", err);
      // Put it back so the UI matches what the server actually has.
      set((state) => {
        const next = new Set(state.dismissedIds);
        next.delete(id);
        return { dismissedIds: next };
      });
    });
  },

  reset: () => {
    loadSeq++;
    set({ lastSeenAt: null, dismissedIds: new Set(), loaded: false });
  },
}));