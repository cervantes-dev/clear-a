-- Orders that never reached "completed" by the end of their day shouldn't
-- carry over into the next one. Cancels any pending / preparing / ready order
-- whose order_date is before today (Manila date, now that the database runs
-- on Manila time).
--
-- It goes through the same UPDATE on orders.status as every other cancel, so
-- trg_set_ready_timestamps stamps cancelled_at and trg_restore_stock_on_cancel
-- gives the stock back -- no special-cased logic.
create or replace function cancel_stale_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
  set status = 'cancelled'
  where status in ('pending', 'preparing', 'ready')
    and order_date is not null
    and order_date < current_date;
end;
$$;

-- Every 10 minutes: cheap, and self-healing -- if a run is ever missed, the
-- next one still catches everything left over, so it doesn't depend on one
-- exact moment around midnight.
select cron.schedule(
  'cancel-stale-orders',
  '*/10 * * * *',
  $$ select cancel_stale_orders(); $$
);

-- Clean up whatever is already stuck right now.
select cancel_stale_orders();