-- Deletes email signups that never finished OTP verification, which frees
-- the LRN they were holding. Deleting from auth.users cascades to profiles
-- (and anything else that references it with on delete cascade).
create or replace function public.cleanup_unconfirmed_signups()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with doomed as (
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      -- confirmation_sent_at resets on every "resend code", so an active
      -- retry is never deleted mid-verification (OTP itself expires in 1h)
      and coalesce(u.confirmation_sent_at, u.created_at) < now() - interval '2 hours'
      -- never touch accounts linked to Google or any other provider
      and not exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider <> 'email'
      )
      -- safety net: never delete anyone who has orders
      and not exists (select 1 from public.orders o where o.student_id = u.id)
  ),
  removed as (
    delete from auth.users where id in (select id from doomed) returning 1
  )
  select count(*) into deleted_count from removed;

  return deleted_count;
end;
$$;

-- Cron-only: nobody should be able to call this from the app.
revoke all on function public.cleanup_unconfirmed_signups() from public, anon, authenticated;

select cron.schedule(
  'cleanup-unconfirmed-signups',
  '*/30 * * * *',
  $$ select public.cleanup_unconfirmed_signups(); $$
);