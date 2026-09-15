export type CartLine = {
  id: string; // cart_items row id -- server-assigned, used to target updates/deletes
  menuItemId: string;
  menuItemName: string;
  imageUrl: string | null;
  variantId: string | null;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
};