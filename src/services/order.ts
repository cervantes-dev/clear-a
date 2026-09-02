import { DailyStock, Order, OrderItem, OrderStatus, PlaceOrderInput } from "../types/order";
import { supabase } from "./supabase";

function mapOrderItemRow(row: any): OrderItem {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    variantId: row.variant_id,
    variantLabel: row.variant_label,
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    subtotal: Number(row.subtotal),
  };
}

function mapOrderRow(row: any): Order {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.profiles?.name ?? null,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    status: row.status,
    total: Number(row.total),
    createdAt: row.created_at,
    readyAt: row.ready_at,
    pickupDeadline: row.pickup_deadline,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    items: (row.order_items ?? []).map(mapOrderItemRow),
  };
}

const ORDER_SELECT = "*, order_items(*), profiles(name)";


/**
 * Places an order from cart contents. Server-side `place_order` RPC looks up
 * real prices and enforces stock limits -- this function never sends price.
 * Returns the full created order (fetched separately since the RPC returns
 * only the new order's id).
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const { data: orderId, error } = await supabase.rpc("place_order", {
    items: input.items.map((i) => ({
      menu_item_id: i.menuItemId,
      variant_id: i.variantId,
      quantity: i.quantity,
    })),
  });

  if (error) throw error;

  return getOrderById(orderId as string);
}

export async function getOrderById(id: string): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;

  return mapOrderRow(data);
}

/** Student's own order history, most recent first. RLS already scopes this to auth.uid(). */
export async function getMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map(mapOrderRow);
}

/** Staff-only: all orders, optionally filtered by status, most recent first. */
export async function getAllOrders(status?: OrderStatus): Promise<Order[]> {
  let query = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map(mapOrderRow);
}

/**
 * Student cancels their own order. RLS only permits this while status is
 * 'pending' or 'preparing' -- a 'ready' order will be rejected by the DB.
 */
export async function cancelOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
}

/** Staff-only: advance an order through its lifecycle. */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function getTodaysStock(): Promise<Record<string, DailyStock>> {
  const { data, error } = await supabase.rpc("get_all_effective_stock");

  if (error) throw error;

  const map: Record<string, DailyStock> = {};
  for (const row of data) {
    map[row.menu_item_id] = {
      menuItemId: row.menu_item_id,
      stockDate: new Date().toISOString().split("T")[0],
      initialQuantity: row.remaining_quantity, // not meaningful pre-seed; display uses remaining
      remainingQuantity: row.remaining_quantity,
    };
  }
  return map;
}

/**
 * Staff sets/updates today's stock cap for an item. Upserts so it works
 * whether today's row already exists or not.
 */
export async function setTodaysStock(menuItemId: string, quantity: number): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("menu_item_daily_stock")
    .upsert(
      {
        menu_item_id: menuItemId,
        stock_date: today,
        initial_quantity: quantity,
        remaining_quantity: quantity,
      },
      { onConflict: "menu_item_id,stock_date" }
    );

  if (error) throw error;
}

/** Removes today's cap entirely, making the item uncapped/unlimited again. */
export async function clearTodaysStock(menuItemId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const { error } = await supabase
    .from("menu_item_daily_stock")
    .delete()
    .eq("menu_item_id", menuItemId)
    .eq("stock_date", today);

  if (error) throw error;
}
