import { create } from "zustand";
import { addToCart, clearCart as clearCartService, getCartItems, removeCartItem, setCartItemQuantity } from "../services/cart";
import { CartLine } from "../types/cart";
import { MenuItem, MenuItemVariant } from "../types/menu";

export type { CartLine };

interface CartState {
  lines: CartLine[];
  loaded: boolean;
  // Resolves true when the cart is in sync with the server (or a newer load /
  // a reset superseded this one), false when the fetch failed so the caller
  // can show a retry instead of an empty cart.
  loadCart: () => Promise<boolean>;
  reset: () => void;
  addItem: (item: MenuItem, variant: MenuItemVariant | null, quantity?: number) => Promise<void>;
  incrementLine: (id: string) => Promise<void>;
  decrementLine: (id: string) => Promise<void>;
  setLineQuantity: (id: string, quantity: number) => Promise<void>;
  removeLine: (id: string) => Promise<void>;
  // Puts a previously removed line back (undo), at its old position if known.
  restoreLine: (line: CartLine, index?: number) => Promise<void>;
  // keepEmptyOnError: after a successful checkout the cart must stay empty
  // locally even if the server-side clear fails -- reverting would show items
  // that were already ordered.
  clear: (opts?: { keepEmptyOnError?: boolean }) => Promise<void>;
  total: () => number;
  itemCount: () => number;
  // Called by the realtime subscription (see hooks/useCartSync.ts) when a
  // change arrives from another device signed into the same account.
  _applyRemoteUpsert: (line: CartLine) => void;
  _applyRemoteDelete: (id: string) => void;
}

// Bumped on every load and on reset, so a slow response from a previous load
// (or a previous account) can't overwrite newer state.
let loadSeq = 0;

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  loaded: false,

  loadCart: async () => {
    const seq = ++loadSeq;
    try {
      const lines = await getCartItems();
      if (seq !== loadSeq) return true;
      set({ lines, loaded: true });
      return true;
    } catch (err) {
      if (seq !== loadSeq) return true;
      // Deliberately NOT marking loaded: a failed load must not look like
      // "your cart is empty". The caller shows a retry instead.
      console.error("Failed to load cart:", err);
      return false;
    }
  },

  reset: () => {
    loadSeq++;
    set({ lines: [], loaded: false });
  },

  addItem: async (item, variant, quantity = 1) => {
    const unitPrice = variant ? variant.price : item.price ?? 0;
    const variantId = variant?.id ?? null;
    const tempId = `temp-${item.id}-${variantId ?? "base"}-${Date.now()}`;
    let mergedExistingId: string | null = null;

    // Optimistic update: merge into an existing line if one's already
    // loaded locally, otherwise add a temp-id placeholder line.
    set((state) => {
      const existing = state.lines.find((l) => l.menuItemId === item.id && l.variantId === variantId);
      if (existing) {
        mergedExistingId = existing.id;
        return {
          lines: state.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + quantity } : l
          ),
        };
      }

      const newLine: CartLine = {
        id: tempId,
        menuItemId: item.id,
        menuItemName: item.name,
        imageUrl: item.imageUrl,
        variantId,
        variantLabel: variant?.label ?? null,
        unitPrice,
        quantity,
      };
      return { lines: [...state.lines, newLine] };
    });

    try {
      const result = await addToCart(item.id, variantId, quantity);
      // Reconcile the local placeholder (or merged line) with the real
      // server-assigned id + authoritative quantity.
      set((state) => ({
        lines: state.lines.map((l) =>
          l.id === tempId || l.id === mergedExistingId
            ? { ...l, id: result.id, quantity: result.quantity }
            : l
        ),
      }));
    } catch (err) {
      console.error("Failed to add item to cart:", err);
      set((state) => {
        if (mergedExistingId) {
          return {
            lines: state.lines.map((l) =>
              l.id === mergedExistingId ? { ...l, quantity: l.quantity - quantity } : l
            ),
          };
        }
        return { lines: state.lines.filter((l) => l.id !== tempId) };
      });
    }
  },

  incrementLine: async (id) => {
    const line = get().lines.find((l) => l.id === id);
    if (!line) return;
    const prevQty = line.quantity;

    set((state) => ({
      lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: l.quantity + 1 } : l)),
    }));

    try {
      await setCartItemQuantity(id, prevQty + 1);
    } catch (err) {
      console.error("Failed to increase quantity:", err);
      set((state) => ({
        lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: prevQty } : l)),
      }));
    }
  },

  decrementLine: async (id) => {
    const line = get().lines.find((l) => l.id === id);
    if (!line) return;
    const prevQty = line.quantity;
    const nextQty = prevQty - 1;

    if (nextQty <= 0) {
      set((state) => ({ lines: state.lines.filter((l) => l.id !== id) }));
      try {
        await removeCartItem(id);
      } catch (err) {
        console.error("Failed to remove item:", err);
        set((state) => ({ lines: [...state.lines, line] }));
      }
      return;
    }

    set((state) => ({
      lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: nextQty } : l)),
    }));

    try {
      await setCartItemQuantity(id, nextQty);
    } catch (err) {
      console.error("Failed to decrease quantity:", err);
      set((state) => ({
        lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: prevQty } : l)),
      }));
    }
  },

  // Used by "Fix cart" to lower a line to what's actually in stock.
  setLineQuantity: async (id, quantity) => {
    const line = get().lines.find((l) => l.id === id);
    if (!line) return;
    if (quantity <= 0) {
      await get().removeLine(id);
      return;
    }
    const prevQty = line.quantity;
    if (quantity === prevQty) return;

    set((state) => ({
      lines: state.lines.map((l) => (l.id === id ? { ...l, quantity } : l)),
    }));

    try {
      await setCartItemQuantity(id, quantity);
    } catch (err) {
      console.error("Failed to set quantity:", err);
      set((state) => ({
        lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: prevQty } : l)),
      }));
    }
  },

  removeLine: async (id) => {
    const prevLines = get().lines;
    set((state) => ({ lines: state.lines.filter((l) => l.id !== id) }));
    try {
      await removeCartItem(id);
    } catch (err) {
      console.error("Failed to remove item:", err);
      set({ lines: prevLines });
    }
  },

  restoreLine: async (line, index) => {
    const tempId = `temp-restore-${line.menuItemId}-${line.variantId ?? "base"}-${Date.now()}`;
    let mergedExistingId: string | null = null;

    set((state) => {
      // The student may have re-added the same item since removing it:
      // merge quantities instead of creating a duplicate line.
      const existing = state.lines.find(
        (l) => l.menuItemId === line.menuItemId && l.variantId === line.variantId
      );
      if (existing) {
        mergedExistingId = existing.id;
        return {
          lines: state.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + line.quantity } : l
          ),
        };
      }

      const next = [...state.lines];
      next.splice(Math.min(index ?? next.length, next.length), 0, { ...line, id: tempId });
      return { lines: next };
    });

    try {
      const result = await addToCart(line.menuItemId, line.variantId, line.quantity);
      set((state) => ({
        lines: state.lines.map((l) =>
          l.id === tempId || l.id === mergedExistingId
            ? { ...l, id: result.id, quantity: result.quantity }
            : l
        ),
      }));
    } catch (err) {
      console.error("Failed to restore cart item:", err);
      set((state) => {
        if (mergedExistingId) {
          return {
            lines: state.lines.map((l) =>
              l.id === mergedExistingId ? { ...l, quantity: l.quantity - line.quantity } : l
            ),
          };
        }
        return { lines: state.lines.filter((l) => l.id !== tempId) };
      });
    }
  },

  clear: async (opts) => {
    const prevLines = get().lines;
    set({ lines: [] });
    try {
      await clearCartService();
    } catch (err) {
      console.error("Failed to clear cart:", err);
      if (!opts?.keepEmptyOnError) set({ lines: prevLines });
    }
  },

  total: () => get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

  itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),

  _applyRemoteUpsert: (line) => {
    set((state) => {
      const exists = state.lines.some((l) => l.id === line.id);
      return {
        lines: exists ? state.lines.map((l) => (l.id === line.id ? line : l)) : [...state.lines, line],
      };
    });
  },

  _applyRemoteDelete: (id) => {
    set((state) => ({ lines: state.lines.filter((l) => l.id !== id) }));
  },
}));