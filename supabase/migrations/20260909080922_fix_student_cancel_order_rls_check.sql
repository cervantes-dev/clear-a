-- The original "students can cancel own unready orders" policy only defined
-- USING, no WITH CHECK. Postgres defaults an UPDATE policy's WITH CHECK to
-- reuse its USING expression -- meaning the *new* row was required to still
-- satisfy `status in ('pending', 'preparing')`. But cancelling always sets
-- status to 'cancelled', so every real cancellation failed WITH CHECK with a
-- generic "new row violates row-level security policy" (42501), even though
-- the guard_student_order_update trigger's own business-logic check passed
-- fine. This just adds the WITH CHECK that was actually intended: the
-- resulting row must still belong to the student and must be 'cancelled'.
drop policy if exists "students can cancel own unready orders" on orders;

create policy "students can cancel own unready orders"
  on orders for update
  using (
    student_id = auth.uid()
    and status in ('pending', 'preparing')
  )
  with check (
    student_id = auth.uid()
    and status = 'cancelled'
  );