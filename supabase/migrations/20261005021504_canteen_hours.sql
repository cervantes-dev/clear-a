-- ===========================================================================
-- Canteen hours: Monday to Friday, 8:00 AM to 5:00 PM (Manila time).
-- ===========================================================================

create table public.canteen_settings (
  id boolean primary key default true,
  open_time time not null default '08:00',
  close_time time not null default '17:00',
  -- ISO weekdays: 1 = Monday ... 7 = Sunday
  open_days int[] not null default '{1,2,3,4,5}',
  -- Staff can close the canteen for one specific day; it expires by itself.
  closed_on date,
  updated_at timestamptz not null default now(),
  constraint canteen_settings_singleton check (id),
  constraint canteen_hours_valid check (open_time < close_time),
  constraint canteen_days_valid check (open_days <@ array[1,2,3,4,5,6,7])
);

insert into public.canteen_settings default values;

alter table public.canteen_settings enable row level security;

create policy "Signed-in users can view canteen settings"
  on public.canteen_settings for select
  to authenticated
  using (true);

create policy "Staff can update canteen settings"
  on public.canteen_settings for update
  to authenticated
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  )
  with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'staff')
  );

grant select on public.canteen_settings to authenticated;
grant update (open_time, close_time, open_days, closed_on) on public.canteen_settings to authenticated;

create trigger set_canteen_settings_updated_at
  before update on public.canteen_settings
  for each row execute procedure public.set_updated_at();

-- Let the apps hear about a staff member closing / reopening live.
alter publication supabase_realtime add table public.canteen_settings;

-- ---------------------------------------------------------------------------
-- Is the canteen open right now? Computed from the SERVER clock in Manila time
-- (explicit, so it doesn't depend on the database timezone setting).
--   reason: null when open, else 'manual' | 'closed_day' | 'before_open' | 'after_close'
--   next_open_at: the next moment ordering opens (null if none is scheduled)
-- ---------------------------------------------------------------------------
create or replace function get_canteen_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s canteen_settings;
  local_date date := (now() at time zone 'Asia/Manila')::date;
  local_time time := (now() at time zone 'Asia/Manila')::time;
  v_reason text := null;
  v_open boolean;
  candidate date;
  next_open timestamp := null;
  i int;
begin
  select * into s from canteen_settings limit 1;

  -- No settings row at all: stay open rather than lock everybody out by accident.
  if not found then
    return jsonb_build_object(
      'is_open', true, 'reason', null, 'next_open_at', null,
      'open_time', '08:00', 'close_time', '17:00'
    );
  end if;

  if s.closed_on = local_date then
    v_reason := 'manual';
  elsif not (extract(isodow from local_date)::int = any (s.open_days)) then
    v_reason := 'closed_day';
  elsif local_time < s.open_time then
    v_reason := 'before_open';
  elsif local_time >= s.close_time then
    v_reason := 'after_close';
  end if;

  v_open := v_reason is null;

  if not v_open then
    for i in 0..14 loop
      candidate := local_date + i;
      if extract(isodow from candidate)::int = any (s.open_days)
         and s.closed_on is distinct from candidate
         and (i > 0 or local_time < s.open_time) then
        next_open := candidate + s.open_time;
        exit;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'is_open', v_open,
    'reason', v_reason,
    'next_open_at', case when next_open is null then null else next_open at time zone 'Asia/Manila' end,
    'open_time', to_char(s.open_time, 'HH24:MI'),
    'close_time', to_char(s.close_time, 'HH24:MI')
  );
end;
$$;

grant execute on function get_canteen_status() to authenticated;

-- ---------------------------------------------------------------------------
-- Enforce it where it can't be bypassed: no order can be inserted while the
-- canteen is closed, whichever way the request arrives. Fires before the
-- order-number trigger (alphabetical), so a refused order never burns a number.
-- The custom SQLSTATE lets the app recognise this error and refresh its banner.
-- ---------------------------------------------------------------------------
create or replace function enforce_canteen_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce((get_canteen_status() ->> 'is_open')::boolean, true) then
    raise exception 'The canteen is closed right now.' using errcode = 'CL001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_canteen_open on orders;
create trigger trg_enforce_canteen_open
  before insert on orders
  for each row execute function enforce_canteen_open();

-- ---------------------------------------------------------------------------
-- Leftover orders: cancelled 30 minutes after closing (a grace period so an
-- order being handed over right at closing time isn't cancelled mid-pickup),
-- and anything from a previous day regardless. Replaces the midnight-only
-- version, whether or not that migration has been run.
-- Same UPDATE on orders.status as every other cancel, so cancelled_at is
-- stamped and stock is given back by the existing triggers.
-- ---------------------------------------------------------------------------
create or replace function cancel_stale_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s canteen_settings;
  manila_now timestamp := now() at time zone 'Asia/Manila';
  manila_today date := (now() at time zone 'Asia/Manila')::date;
  after_closing boolean := false;
begin
  select * into s from canteen_settings limit 1;
  if found then
    after_closing := manila_now >= (manila_today + s.close_time + interval '30 minutes');
  end if;

  update orders
  set status = 'cancelled'
  where status in ('pending', 'preparing', 'ready')
    and order_date is not null
    and (order_date < manila_today or (after_closing and order_date = manila_today));
end;
$$;

-- Same job name as before: this replaces the existing schedule.
select cron.schedule(
  'cancel-stale-orders',
  '*/10 * * * *',
  $$ select cancel_stale_orders(); $$
);

-- Clean up whatever is already stuck right now.
select cancel_stale_orders();