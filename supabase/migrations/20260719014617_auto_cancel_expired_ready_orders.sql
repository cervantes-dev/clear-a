-- Cancels any order still sitting in 'ready' status past its pickup_deadline.
-- Uses the exact same status-transition path as everything else (an UPDATE
-- on orders.status), so trg_set_ready_timestamps fires normally and stamps
-- cancelled_at -- no special-cased logic needed for this bulk update.
create or replace function auto_cancel_expired_orders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update orders
  set status = 'cancelled'
  where status = 'ready'
    and pickup_deadline is not null
    and pickup_deadline < now();
end;
$$;

-- Runs every minute -- frequent enough that a student's countdown timer and
-- actual cancellation stay closely in sync, without being wastefully tight.
select cron.schedule(
  'auto-cancel-expired-orders',
  '* * * * *',
  $$ select auto_cancel_expired_orders(); $$
);