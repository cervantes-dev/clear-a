-- Create role enum
create type user_role as enum ('student', 'staff');

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role user_role not null default 'student',
  student_id text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can view their own profile
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, student_id)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.raw_user_meta_data->>'student_id'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();