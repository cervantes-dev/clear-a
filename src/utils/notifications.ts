import { NotificationItem } from "../types/notification";
import { Order } from "../types/order";

/**
 * Turns a student's orders into a notification feed, purely from timestamps
 * already present on each order (createdAt, readyAt, completedAt,
 * cancelledAt) -- no separate notifications table needed. "preparing" has
 * no dedicated timestamp column, so it isn't represented as its own event.
 */
export function deriveOrderNotifications(orders: Order[]): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const order of orders) {
    const label = order.orderNumber ? `#${String(order.orderNumber).padStart(3, "0")}` : "Your order";

    items.push({
      id: `${order.id}-placed`,
      orderId: order.id,
      title: `Order ${label} placed`,
      message: "We'll notify you as it's prepared.",
      icon: "receipt-outline",
      color: "#E69500",
      timestamp: order.createdAt,
    });

    if (order.readyAt) {
      items.push({
        id: `${order.id}-ready`,
        orderId: order.id,
        title: `Order ${label} is ready!`,
        message: "Show your QR code at pickup.",
        icon: "bag-check-outline",
        color: "#2E9E44",
        timestamp: order.readyAt,
      });
    }

    if (order.completedAt) {
      items.push({
        id: `${order.id}-completed`,
        orderId: order.id,
        title: `Order ${label} completed`,
        message: "Enjoy your meal!",
        icon: "checkmark-circle-outline",
        color: "#2B2B2B",
        timestamp: order.completedAt,
      });
    }

    if (order.cancelledAt) {
      items.push({
        id: `${order.id}-cancelled`,
        orderId: order.id,
        title: `Order ${label} was cancelled`,
        message: "This order won't be prepared.",
        icon: "close-circle-outline",
        color: "#D32F2F",
        timestamp: order.cancelledAt,
      });
    }
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}