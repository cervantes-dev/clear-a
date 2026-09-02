-- Add description and unit_label to menu_items
alter table menu_items add column description text;
alter table menu_items add column unit_label text; -- e.g. "per order", "per pc" - only used when the item has no variants

-- Price becomes optional: items using variants (see below) leave this null,
-- since the actual sellable price comes from the chosen variant instead.
alter table menu_items alter column price drop not null;

-- Variants: optional per-item size/option list, each with its own price.
-- e.g. Coke -> "Sakto" ₱15, "8oz" ₱20, "Liter" ₱40
create table menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table menu_item_variants enable row level security;

create policy "Anyone can view menu item variants"
  on menu_item_variants for select
  using (true);

create policy "Staff can manage menu item variants"
  on menu_item_variants for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'staff'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'staff'
    )
  );