-- Categories (dynamic, staff-manageable)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Menu items
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  price numeric(10, 2) not null,
  available boolean not null default true,
  is_special boolean not null default false,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Keep updated_at current on every edit
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger set_menu_items_updated_at
  before update on menu_items
  for each row execute procedure public.set_updated_at();

-- RLS
alter table categories enable row level security;
alter table menu_items enable row level security;

-- Everyone (students + staff) can read categories and menu items
create policy "Anyone can view categories"
  on categories for select
  using (true);

create policy "Anyone can view menu items"
  on menu_items for select
  using (true);

-- Only staff can create/edit/delete categories
create policy "Staff can manage categories"
  on categories for all
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

-- Only staff can create/edit/delete menu items
create policy "Staff can manage menu items"
  on menu_items for all
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

-- Storage bucket for menu item images (public read, staff write)
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "Public can view menu images"
  on storage.objects for select
  using (bucket_id = 'menu-images');

create policy "Staff can upload menu images"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'staff'
    )
  );

create policy "Staff can update menu images"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'staff'
    )
  );

create policy "Staff can delete menu images"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'staff'
    )
  );

-- Seed starting categories so the app isn't empty on first run
insert into categories (name) values
  ('Rice Meals'),
  ('Snacks'),
  ('Drinks'),
  ('Desserts');