-- Students may cancel their own order only while it is still 'pending'.
-- Once staff starts preparing, only staff can cancel.
drop policy if exists "students can cancel own unready orders" on orders;

create policy "students can cancel own pending orders"
  on orders for update
  using (
    student_id = auth.uid()
    and status = 'pending'
  )
  with check (
    student_id = auth.uid()
    and status = 'cancelled'
  );