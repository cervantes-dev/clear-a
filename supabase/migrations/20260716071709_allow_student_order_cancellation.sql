-- RLS: students may update only their own orders, and only while the order
-- hasn't reached 'ready' yet (i.e. still pending or preparing)
create policy "students can cancel own unready orders"
  on orders for update
  using (
    student_id = auth.uid()
    and status in ('pending', 'preparing')
  );

-- Guard: even though the RLS policy above lets a student touch the row,
-- this trigger enforces that a *student-initiated* update can only ever
-- set status to 'cancelled' -- nothing else about the order can change,
-- and they can't set any other status themselves.
create or replace function guard_student_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_staff boolean;
begin
  select exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff'
  ) into is_staff;

  -- Staff updates are unrestricted by this guard (their own RLS policy already applies)
  if is_staff then
    return new;
  end if;

  -- Non-staff (i.e. the student themselves, via the policy above) may only cancel
  if new.status is distinct from 'cancelled' then
    raise exception 'Students may only cancel their own orders';
  end if;

  if new.total is distinct from old.total
     or new.student_id is distinct from old.student_id
     or new.order_number is distinct from old.order_number then
    raise exception 'Students may not modify order details';
  end if;

  return new;
end;
$$;

create trigger trg_guard_student_order_update
before update on orders
for each row
execute function guard_student_order_update();