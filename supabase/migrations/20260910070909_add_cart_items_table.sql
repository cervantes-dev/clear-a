-- Per-user shopping cart, synced across devices signed into the same
-- account. Previously the cart only lived in local Zustand state on
-- whichever device added the item, so two devices on the same account had
-- completely disconnected carts.
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  variant_id uuid references public.menu_item_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cart_items_user_id_idx on public.cart_items (user_id);

-- Reuses the same set_updated_at() helper already defined for menu_items.
create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute procedure public.set_updated_at();

alter table public.cart_items enable row level security;

create policy "Users can view their own cart items"
  on public.cart_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own cart items"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own cart items"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own cart items"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- So an add/update/remove on one device pushes live to any other device
-- signed into the same account, same pattern as orders and
-- menu_item_daily_stock.
alter publication supabase_realtime add table public.cart_items;