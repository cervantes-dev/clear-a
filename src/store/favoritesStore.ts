import { create } from "zustand";
import { addFavorite, getFavoriteIds, removeFavorite } from "../services/favorites";

interface FavoritesState {
  favoriteIds: Set<string>;
  loaded: boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (itemId: string) => Promise<void>;
  isFavorite: (itemId: string) => boolean;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: new Set(),
  loaded: false,

  loadFavorites: async () => {
    try {
      const ids = await getFavoriteIds();
      set({ favoriteIds: new Set(ids), loaded: true });
    } catch (err) {
      console.error("Failed to load favorites:", err);
      set({ loaded: true });
    }
  },

  toggleFavorite: async (itemId: string) => {
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
      console.error("Failed to toggle favorite:", err);

      // 23505 = unique_violation. If we were trying to ADD and hit this,
      // it means the item was already favorited server-side even though
      // local state said otherwise (e.g. loadFavorites hadn't run yet, or
      // it was favorited from another device). The DB is already in the
      // state we wanted, so keep the optimistic "favorited" UI instead of
      // reverting it back to unfavorited -- reverting here would be wrong,
      // not just unnecessary.
      if (!wasFavorite && err?.code === "23505") {
        return;
      }

      // revert on any other failure
      set((state) => {
        const next = new Set(state.favoriteIds);
        if (wasFavorite) next.add(itemId);
        else next.delete(itemId);
        return { favoriteIds: next };
      });
    }
  },

  isFavorite: (itemId: string) => get().favoriteIds.has(itemId),

  reset: () => set({ favoriteIds: new Set(), loaded: false }),
}));