create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, student_id)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    ),
    new.raw_user_meta_data->>'student_id'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;