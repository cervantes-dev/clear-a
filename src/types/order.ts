export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export type OrderItem = {
  id: string;
  menuItemId: string | null; // null if the original menu item was later deleted
  menuItemName: string; // snapshot — survives menu item edits/deletion
  variantId: string | null;
  variantLabel: string | null; // e.g. "8oz" — snapshot, same reasoning as menuItemName
  unitPrice: number; // price at time of order, never the live menu_items.price
  quantity: number;
  subtotal: number; // unitPrice * quantity, computed by the DB
};

export type Order = {
  id: string;
  studentId: string;
  studentName: string | null; // joined from profiles — only meaningfully populated on staff queries
  orderNumber: number | null;
  orderDate: string | null;
  status: OrderStatus;
  total: number;
  createdAt: string;
  readyAt: string | null;
  pickupDeadline: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
};

// What the app sends when placing a new order (from the cart).
// Server-side (place_order function) looks up real prices — client never sends unitPrice.
export type PlaceOrderItemInput = {
  menuItemId: string;
  variantId: string | null;
  quantity: number;
};

export type PlaceOrderInput = {
  items: PlaceOrderItemInput[];
};

// Per-item stock, mirrors menu_item_daily_stock. null = uncapped/unlimited for that item today.
export type DailyStock = {
  menuItemId: string;
  stockDate: string;
  initialQuantity: number;
  remainingQuantity: number;
};

