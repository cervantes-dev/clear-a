-- Helper avoids RLS recursion (a policy on profiles can't query profiles directly)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'staff'
  );
$$;

grant execute on function public.is_staff() to authenticated;

create policy "Staff can view all profiles"
  on profiles for select
  using (public.is_staff());

-- Make current_date in every function/trigger/default use Manila time
alter database postgres set timezone to 'Asia/Manila';