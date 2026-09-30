import { create } from "zustand";
import { addFavorite, getFavoriteIds, removeFavorite } from "../services/favorites";

interface FavoritesState {
  favoriteIds: Set<string>;
  loaded: boolean;
  // Resolves true when the store is in sync with the server (or a newer load
  // superseded this one), false when the fetch failed so the caller can retry.
  loadFavorites: () => Promise<boolean>;
  toggleFavorite: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
  reset: () => void;
}

// Items whose add/remove request is still in flight. Extra taps on the same
// heart are ignored until it settles: otherwise a quick double tap can send
// the delete before the insert lands, leaving local and server state
// disagreeing. A reload also keeps these items' optimistic state instead of
// overwriting it with a stale server snapshot.
const inFlight = new Set<string>();

// Bumped on every load and on reset, so a slow response from a previous load
// (or a previous account) can't overwrite newer state.
let loadSeq = 0;

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),
  loaded: false,

  loadFavorites: async () => {
    const seq = ++loadSeq;
    try {
      const ids = await getFavoriteIds();
      if (seq !== loadSeq) return true; // superseded by a newer load or a reset

      const next = new Set(ids);
      const current = get().favoriteIds;
      inFlight.forEach((id) => {
        if (current.has(id)) next.add(id);
        else next.delete(id);
      });

      set({ favoriteIds: next, loaded: true });
      return true;
    } catch (err) {
      if (seq !== loadSeq) return true;
      // Deliberately NOT marking loaded: a failed load must not look like
      // "no favorites". The caller retries.
      console.error("Failed to load favorites:", err);
      return false;
    }
  },

  toggleFavorite: async (itemId: string) => {
    if (inFlight.has(itemId)) return;
    inFlight.add(itemId);

    const wasFavorite = get().favoriteIds.has(itemId);

    // optimistic update
    set((state) => {
      const next = new Set(state.favoriteIds);
      if (wasFavorite) next.delete(itemId);
      else next.add(itemId);
      return { favoriteIds: next };
    });

    try {
      if (wasFavorite) await removeFavorite(itemId);
      else await addFavorite(itemId);
    } catch (err: any) {
      // 23505 = unique_violation: the item was already favorited server-side,
      // so the DB is already in the state we wanted. Keep the optimistic UI.
      if (!wasFavorite && err?.code === "23505") {
        return;
      }

      console.error("Failed to toggle favorite:", err);

      // revert on any other failure
      set((state) => {
        const next = new Set(state.favoriteIds);
        if (wasFavorite) next.add(itemId);
        else next.delete(itemId);
        return { favoriteIds: next };
      });
    } finally {
      inFlight.delete(itemId);
    }
  },

  isFavorite: (itemId: string) => get().favoriteIds.has(itemId),

  reset: () => {
    loadSeq++;
    inFlight.clear();
    set({ favoriteIds: new Set(), loaded: false });
  },
}));