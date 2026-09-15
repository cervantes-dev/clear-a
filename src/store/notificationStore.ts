import { create } from "zustand";

interface NotificationState {
  lastSeenAt: string | null; // ISO timestamp -- notifications after this are "unread"
  dismissedIds: Set<string>; // notifications are derived, not stored rows, so
  // "deleting" one just hides it locally rather than mutating any order data
  markAllSeen: () => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  lastSeenAt: null,
  dismissedIds: new Set(),

  markAllSeen: () => set({ lastSeenAt: new Date().toISOString() }),

  dismiss: (id) =>
    set((state) => {
      const next = new Set(state.dismissedIds);
      next.add(id);
      return { dismissedIds: next };
    }),
}));