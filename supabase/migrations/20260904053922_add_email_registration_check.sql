-- Lets the client check, before starting signup, whether an email is
-- already registered and under which provider -- so a manual signup can be
-- stopped with a clear message ("that email is a Google account") instead
-- of failing confusingly later, and so a genuinely abandoned/unconfirmed
-- signup can still be resent rather than blocked.
create or replace function public.check_email_registration(check_email text)
returns table(exists_already boolean, provider text, confirmed boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_confirmed_at timestamptz;
  v_provider text;
begin
  select id, email_confirmed_at into v_user_id, v_confirmed_at
  from auth.users
  where email = check_email
  limit 1;

  if v_user_id is null then
    return query select false, null::text, false;
    return;
  end if;

  select provider into v_provider
  from auth.identities
  where user_id = v_user_id
  order by created_at asc
  limit 1;

  return query select true, coalesce(v_provider, 'email'), (v_confirmed_at is not null);
end;
$$;

grant execute on function public.check_email_registration(text) to anon, authenticated;