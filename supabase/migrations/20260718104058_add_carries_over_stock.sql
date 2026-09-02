-- New per-item flag: false (default) = perishable, resets to unlimited each
-- new day until staff sets it. true = ongoing stock, remaining count rolls
-- forward automatically day to day until it runs out or staff restocks.
alter table menu_items add column carries_over_stock boolean not null default false;

-- Updated to auto-seed today's row from the most recent prior day's leftover
-- when an item is marked carries_over_stock and no row exists yet today.
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
      -- Pull the most recent previous day's leftover, regardless of how many
      -- days ago it was set (e.g. canteen closed over a weekend) -- whatever
      -- was last recorded is still accurate since nothing consumed it since.
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
      -- No prior row at all yet (brand new item) -- treat as unlimited, same
      -- as a perishable item with nothing set.
    end if;
    -- Not carries_over and no row today -- unchanged existing behavior: unlimited.
  end if;

  return new;
end;
$$;

-- Read-only helper: what SHOULD show as today's stock for one item, including
-- virtual carry-over that hasn't been "realized" into an actual row yet
-- (i.e. no order has come in today to trigger the seeding above). This lets
-- the UI show the correct number even before the first order of the day.
create or replace function get_all_effective_stock()
returns table(menu_item_id uuid, remaining_quantity integer, is_carried_over boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    mi.id,
    coalesce(today.remaining_quantity, case when mi.carries_over_stock then latest.remaining_quantity end),
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
  ) latest on true
  where coalesce(today.remaining_quantity, case when mi.carries_over_stock then latest.remaining_quantity end) is not null;
$$;

grant execute on function get_all_effective_stock() to authenticated;