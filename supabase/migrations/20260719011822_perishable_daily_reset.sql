-- Enable pg_cron if not already active on this project. On some Supabase
-- plans this must be turned on via Dashboard > Database > Extensions first --
-- if this line errors with a permissions issue, enable it there, then re-run
-- just the rest of this migration.
create extension if not exists pg_cron with schema extensions;

-- Nightly reset: every perishable item goes back to unavailable, forcing
-- staff to explicitly re-enable (and typically re-stock) it each day.
-- Non-perishables (carries_over_stock = true) are untouched here.
create or replace function reset_daily_perishables()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update menu_items
  set available = false
  where carries_over_stock = false
    and available = true;
end;
$$;

-- Runs at 16:00 UTC = 00:00 Asia/Manila (adjust the hour if your canteen
-- operates in a different timezone).
select cron.schedule(
  'reset-perishables-daily',
  '0 16 * * *',
  $$ select reset_daily_perishables(); $$
);

-- Perishable items with no stock row set today now report 0 (out of stock)
-- instead of unlimited. Non-perishables keep carrying over as before, or
-- report unlimited (null) only if truly never stocked at all.
create or replace function get_all_effective_stock()
returns table(menu_item_id uuid, remaining_quantity integer, is_carried_over boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    mi.id,
    case
      when today.remaining_quantity is not null then today.remaining_quantity
      when mi.carries_over_stock then latest.remaining_quantity  -- null if never stocked = unlimited
      else 0  -- perishable, no row today = out of stock, not unlimited
    end,
    (today.remaining_quantity is null and mi.carries_over_stock and latest.remaining_quantity is not null)
  from menu_items mi
  left join menu_item_daily_stock today
    on today.menu_item_id = mi.id and today.stock_date = current_date
  left join lateral (
    select remaining_quantity
    from menu_item_daily_stock s
    where s.menu_item_id = mi.id
    order by stock_date desc
    limit 1
  ) latest on true;
$$;

grant execute on function get_all_effective_stock() to authenticated;

-- Ordering enforcement matches the same rule: a perishable item with no
-- stock row today can't be ordered at all (treated as sold out), rather
-- than silently allowing unlimited orders.
create or replace function decrement_daily_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
  v_carries_over boolean;
  v_latest_remaining integer;
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

    select carries_over_stock into v_carries_over
    from menu_items where id = new.menu_item_id;

    if v_carries_over then
      select remaining_quantity into v_latest_remaining
      from menu_item_daily_stock
      where menu_item_id = new.menu_item_id
      order by stock_date desc
      limit 1;

      if v_latest_remaining is not null then
        if v_latest_remaining < new.quantity then
          raise exception 'Not enough stock remaining for this item today';
        end if;

        insert into menu_item_daily_stock (menu_item_id, stock_date, initial_quantity, remaining_quantity)
        values (new.menu_item_id, current_date, v_latest_remaining, v_latest_remaining - new.quantity);
      end if;
      -- No prior row ever -- unlimited, same as before.
    else
      -- Perishable with no row today = out of stock, block the order.
      raise exception 'Not enough stock remaining for this item today';
    end if;
  end if;

  return new;
end;
$$;