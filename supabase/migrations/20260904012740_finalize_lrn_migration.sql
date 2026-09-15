-- Consolidated fix: an earlier attempt at this rename partially failed and
-- rolled back, leaving the DB with only the original unique constraint
-- under its old name, still on the original student_id column, and no
-- format check at all. This migration establishes the final state in one
-- shot so a partial failure can't leave things half-renamed again.

-- 1. Add the format check that never actually landed (still targeting the
--    current column name -- renamed in step 2, which Postgres will follow
--    automatically for constraint expressions).
alter table profiles
  add constraint profiles_student_id_format check (
    student_id is null or student_id ~ '^[0-9]{12}$'
  );

-- 2. Rename the column.
alter table profiles rename column student_id to lrn;

-- 3. Rename both constraints for clarity.
alter table profiles rename constraint profiles_student_id_unique to profiles_lrn_unique;
alter table profiles rename constraint profiles_student_id_format to profiles_lrn_format;

-- 4. Update the signup trigger to read/write the renamed column.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, lrn)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    ),
    new.raw_user_meta_data->>'lrn'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;