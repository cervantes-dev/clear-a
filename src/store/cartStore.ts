import { create } from "zustand";
import { MenuItem, MenuItemVariant } from "../types/menu";

export type CartLine = {
  menuItemId: string;
  menuItemName: string;
  imageUrl: string | null;
  variantId: string | null;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
};

interface CartState {
  lines: CartLine[];
  addItem: (item: MenuItem, variant: MenuItemVariant | null, quantity?: number) => void;
  incrementLine: (menuItemId: string, variantId: string | null) => void;
  decrementLine: (menuItemId: string, variantId: string | null) => void;
  removeLine: (menuItemId: string, variantId: string | null) => void;
  clear: () => void;
  total: () => number;
  itemCount: () => number;
}

function sameLine(a: CartLine, menuItemId: string, variantId: string | null): boolean {
  return a.menuItemId === menuItemId && a.variantId === variantId;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],

  addItem: (item, variant, quantity = 1) => {
    const unitPrice = variant ? variant.price : item.price ?? 0;

    set((state) => {
      const existing = state.lines.find((l) => sameLine(l, item.id, variant?.id ?? null));

      if (existing) {
        return {
          lines: state.lines.map((l) =>
            sameLine(l, item.id, variant?.id ?? null) ? { ...l, quantity: l.quantity + quantity } : l
          ),
        };
      }

      const newLine: CartLine = {
        menuItemId: item.id,
        menuItemName: item.name,
        imageUrl: item.imageUrl,
        variantId: variant?.id ?? null,
        variantLabel: variant?.label ?? null,
        unitPrice,
        quantity,
      };

      return { lines: [...state.lines, newLine] };
    });
  },

  incrementLine: (menuItemId, variantId) => {
    set((state) => ({
      lines: state.lines.map((l) =>
        sameLine(l, menuItemId, variantId) ? { ...l, quantity: l.quantity + 1 } : l
      ),
    }));
  },

  decrementLine: (menuItemId, variantId) => {
    set((state) => ({
      lines: state.lines
        .map((l) => (sameLine(l, menuItemId, variantId) ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    }));
  },

  removeLine: (menuItemId, variantId) => {
    set((state) => ({
      lines: state.lines.filter((l) => !sameLine(l, menuItemId, variantId)),
    }));
  },

  clear: () => set({ lines: [] }),

  total: () => get().lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),

  itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
}));