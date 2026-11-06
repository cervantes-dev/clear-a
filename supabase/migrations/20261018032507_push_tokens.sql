create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- No direct client access; everything goes through the two functions below.
alter table public.push_tokens enable row level security;

-- Upsert so a phone that switches accounts re-points its token to the new user.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;