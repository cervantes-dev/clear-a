export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
  createdAt: string;
};

export type MenuItemVariant = {
  id: string;
  label: string;
  price: number;
  sortOrder: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  price: number | null; // null when the item uses variants instead
  unitLabel: string | null; // e.g. "per order" - only relevant when price is set
  available: boolean;
  isSpecial: boolean;
  imageUrl: string | null;
  variants: MenuItemVariant[];
  carriesOverStock: boolean; // false = perishable, resets to unlimited daily. true = ongoing stock, leftover carries to next day
  createdAt: string;
  updatedAt: string;
};

export type MenuItemInput = {
  name: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  price: number | null;
  unitLabel: string | null;
  available: boolean;
  isSpecial: boolean;
  imageUrl: string | null;
  variants: { label: string; price: number }[]; // empty array = no variants, use price instead
  carriesOverStock: boolean;
};