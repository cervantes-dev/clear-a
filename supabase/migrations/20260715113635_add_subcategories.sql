-- Subcategories ("Type") - scoped to a specific parent category.
-- e.g. category "Drinks" -> subcategories "Soft Drinks", "Water", "Milk Tea"
create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique (category_id, name)
);

alter table menu_items add column subcategory_id uuid references subcategories(id) on delete set null;

alter table subcategories enable row level security;

create policy "Anyone can view subcategories"
  on subcategories for select
  using (true);

create policy "Staff can manage subcategories"
  on subcategories for all
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