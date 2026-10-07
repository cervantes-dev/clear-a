-- Optional note from the student to the canteen ("no onions", "sauce on the side").
alter table orders add column note text;
alter table orders
  add constraint orders_note_length check (note is null or char_length(note) <= 200);

-- Two-argument overload of place_order. It calls the existing one-argument
-- function unchanged (price lookup, stock checks, order number, totals all stay
-- exactly as they are), then stamps the note in the same transaction -- so an
-- order can never exist without the note the student typed.
-- The parameter is p_note, not note, so `set note = ...` below can't be
-- confused with the column of the same name.
create or replace function place_order(items jsonb, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  clean_note text := nullif(left(btrim(coalesce(p_note, '')), 200), '');
begin
  new_order_id := place_order(items);

  if clean_note is not null then
    -- Same transaction-local flag place_order() uses so students can't update
    -- orders directly; it clears itself at the end of the transaction.
    perform set_config('app.order_guard_bypass', 'on', true);
    update orders set note = clean_note where id = new_order_id;
  end if;

  return new_order_id;
end;
$$;

grant execute on function place_order(jsonb, text) to authenticated;