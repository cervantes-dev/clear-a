-- One row per menu item per day. Absence of a row = unlimited/uncapped for that item.
create table menu_item_daily_stock (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  stock_date date not null default current_date,
  initial_quantity integer not null check (initial_quantity >= 0),
  remaining_quantity integer not null check (remaining_quantity >= 0),
  unique (menu_item_id, stock_date)
);

-- Atomically decrements stock on order placement. If a stock row exists for
-- today and there isn't enough left, the insert is rejected outright -- this
-- is what makes it race-safe under concurrent orders, not just a UI check.
create or replace function decrement_daily_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if new.menu_item_id is null then
    return new;
  end if;

  update menu_item_daily_stock
  set remaining_quantity = remaining_quantity - new.quantity
  where menu_item_id = new.menu_item_id
    and stock_date = current_date
    and remaining_quantity >= new.quantity;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    if exists (
      select 1 from menu_item_daily_stock
      where menu_item_id = new.menu_item_id and stock_date = current_date
    ) then
      raise exception 'Not enough stock remaining for this item today';
    end if;
    -- no stock row today for this item => uncapped, let it through
  end if;

  return new;
end;
$$;

create trigger trg_decrement_daily_stock
before insert on order_items
for each row
execute function decrement_daily_stock();

-- Give stock back when a student (or staff) cancels an order
create or replace function restore_daily_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update menu_item_daily_stock s
    set remaining_quantity = s.remaining_quantity + oi.quantity
    from order_items oi
    where oi.order_id = new.id
      and oi.menu_item_id = s.menu_item_id
      and s.stock_date = new.order_date;
  end if;
  return new;
end;
$$;

create trigger trg_restore_stock_on_cancel
after update on orders
for each row
execute function restore_daily_stock_on_cancel();

-- RLS
alter table menu_item_daily_stock enable row level security;

create policy "everyone can view daily stock"
  on menu_item_daily_stock for select
  using (true);

create policy "staff can manage daily stock"
  on menu_item_daily_stock for all
  using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  );