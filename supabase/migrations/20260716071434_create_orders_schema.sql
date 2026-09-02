-- Order status lifecycle
create type order_status as enum ('pending', 'preparing', 'ready', 'completed', 'cancelled');

-- Daily counter backing the per-day sequential order number (#001, #002, resets at midnight)
create table daily_order_counters (
  order_date date primary key,
  last_number integer not null default 0
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  order_number integer,
  order_date date,
  status order_status not null default 'pending',
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  ready_at timestamptz,       -- set when staff marks it "ready" — starts the 10-min pickup clock
  pickup_deadline timestamptz, -- ready_at + 10 minutes, set alongside ready_at
  completed_at timestamptz,
  cancelled_at timestamptz,
  unique (order_date, order_number)
);

-- Order line items — snapshots name/price so later menu edits never alter past orders
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  menu_item_name text not null,
  variant_id uuid references menu_item_variants(id) on delete set null,
  variant_label text,
  unit_price numeric not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric generated always as (unit_price * quantity) stored
);

-- Atomically assign the next sequential order_number for today, resetting the sequence each new date
create or replace function set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
begin
  insert into daily_order_counters (order_date, last_number)
  values (current_date, 1)
  on conflict (order_date)
  do update set last_number = daily_order_counters.last_number + 1
  returning last_number into next_number;

  new.order_number := next_number;
  new.order_date := current_date;
  return new;
end;
$$;

create trigger trg_set_order_number
before insert on orders
for each row
execute function set_order_number();

-- When staff flips status to "ready", stamp ready_at and compute the 10-min pickup_deadline in one place
create or replace function set_ready_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    new.ready_at := now();
    new.pickup_deadline := now() + interval '10 minutes';
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_set_ready_timestamps
before update on orders
for each row
execute function set_ready_timestamps();

-- RLS
alter table orders enable row level security;
alter table order_items enable row level security;
alter table daily_order_counters enable row level security;

-- Students: see and create only their own orders. Cannot update status directly (staff-only).
create policy "students can view own orders"
  on orders for select
  using (student_id = auth.uid());

create policy "students can create own orders"
  on orders for insert
  with check (student_id = auth.uid());

-- Staff: full visibility and control over every order
create policy "staff can view all orders"
  on orders for select
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  );

create policy "staff can update orders"
  on orders for update
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  );

-- order_items: visibility follows the parent order
create policy "students can view own order items"
  on order_items for select
  using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.student_id = auth.uid())
  );

create policy "students can insert own order items"
  on order_items for insert
  with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.student_id = auth.uid())
  );

create policy "staff can view all order items"
  on order_items for select
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  );

-- daily_order_counters is internal bookkeeping only — no client access needed, all writes happen via the trigger (security definer)
create policy "no direct client access to counters"
  on daily_order_counters for all
  using (false);