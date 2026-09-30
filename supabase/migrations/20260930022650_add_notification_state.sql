-- Which derived order notifications a student has dismissed.
-- notification_id is text because notifications are derived from orders
-- (see utils/notifications.ts), not stored rows with their own uuid.
create table public.notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_dismissals enable row level security;

create policy "Users can view their own dismissals"
  on public.notification_dismissals for select
  using (auth.uid() = user_id);

create policy "Users can add their own dismissals"
  on public.notification_dismissals for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own dismissals"
  on public.notification_dismissals for delete
  using (auth.uid() = user_id);

-- When the student last opened the notification panel (drives the unread
-- badge), one row per user.
create table public.notification_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.notification_state enable row level security;

create policy "Users can view their own notification state"
  on public.notification_state for select
  using (auth.uid() = user_id);

create policy "Users can create their own notification state"
  on public.notification_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notification state"
  on public.notification_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Explicit grants: Supabase is moving to "new tables are not exposed to the
-- Data API by default", so don't rely on the old auto-expose behavior.
grant select, insert, delete on public.notification_dismissals to authenticated;
grant select, insert, update on public.notification_state to authenticated;