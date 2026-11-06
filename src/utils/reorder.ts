import { getMenuItems } from "../services/menu";
import { getTodaysStock } from "../services/order";
import { useCartStore } from "../store/cartStore";
import { MenuItem, MenuItemVariant } from "../types/menu";
import { Order } from "../types/order";

export type ReorderResult = {
  /** Order lines put into the cart (possibly with a lowered quantity). */
  added: number;
  /** Order lines skipped: item gone, unavailable, sold out, or its size no longer exists. */
  skipped: number;
  /** Added lines whose quantity was lowered to what's left in stock. */
  reduced: number;
};

/**
 * Re-adds a past order's items to the cart using the CURRENT menu: today's
 * prices, today's availability and today's stock. Fetches fresh data instead
 * of trusting what the screen already has, since a past order can be weeks old.
 */
export async function reorderToCart(order: Order): Promise<ReorderResult> {
  const [menuItems, stock] = await Promise.all([getMenuItems(), getTodaysStock()]);
  const menuById = new Map<string, MenuItem>(menuItems.map((m) => [m.id, m]));
  const { addItem, lines } = useCartStore.getState();

  // Stock already spoken for: what's in the cart now, plus what this reorder
  // has put aside for earlier lines (two sizes of one drink share one stock).
  const inCart: Record<string, number> = {};
  for (const l of lines) inCart[l.menuItemId] = (inCart[l.menuItemId] ?? 0) + l.quantity;
  const allocated: Record<string, number> = {};

  const result: ReorderResult = { added: 0, skipped: 0, reduced: 0 };
  const pending: Promise<void>[] = [];

  for (const orderItem of order.items) {
    // menuItemId is null when the original menu item was deleted afterwards.
    const item = orderItem.menuItemId ? menuById.get(orderItem.menuItemId) : undefined;
    if (!item || !item.available) {
      result.skipped++;
      continue;
    }

    let variant: MenuItemVariant | null = null;
    if (item.variants.length > 0) {
      variant = orderItem.variantId ? item.variants.find((v) => v.id === orderItem.variantId) ?? null : null;
      if (!variant) {
        // The size was removed (or the item now has sizes it didn't have):
        // don't guess which one the student wants.
        result.skipped++;
        continue;
      }
    } else if (item.price === null || orderItem.variantId) {
      result.skipped++;
      continue;
    }

    let quantity = orderItem.quantity;
    const remaining = stock[item.id]?.remainingQuantity ?? null;
    if (remaining !== null) {
      const free = remaining - (inCart[item.id] ?? 0) - (allocated[item.id] ?? 0);
      if (free <= 0) {
        result.skipped++;
        continue;
      }
      if (quantity > free) {
        quantity = free;
        result.reduced++;
      }
    }

    allocated[item.id] = (allocated[item.id] ?? 0) + quantity;
    pending.push(addItem(item, variant, quantity));
    result.added++;
  }

  // addItem is optimistic and handles its own server errors (it rolls back and
  // logs), so waiting here only makes sure the requests have settled.
  await Promise.all(pending);
  return result;
}