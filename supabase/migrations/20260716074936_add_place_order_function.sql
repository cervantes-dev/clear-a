-- Atomically creates an order + its order_items from a cart, looking up real
-- prices server-side (client never supplies price). Runs as the calling
-- student's own insert via security definer only to safely join menu_items/
-- menu_item_variants under RLS -- the order itself is still owned by auth.uid().
--
-- items: jsonb array of { "menu_item_id": uuid, "variant_id": uuid|null, "quantity": int }
create or replace function place_order(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  running_total numeric := 0;
  item jsonb;
  v_menu_item_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_item_name text;
  v_item_available boolean;
  v_variant_label text;
  v_unit_price numeric;
begin
  if jsonb_array_length(items) = 0 then
    raise exception 'Cannot place an order with no items';
  end if;

  -- Create the empty order shell first -- trg_set_order_number assigns
  -- order_number/order_date on insert.
  insert into orders (student_id, status, total)
  values (auth.uid(), 'pending', 0)
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items)
  loop
    v_menu_item_id := (item->>'menu_item_id')::uuid;
    v_variant_id := nullif(item->>'variant_id', '')::uuid;
    v_quantity := (item->>'quantity')::integer;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid quantity for menu item %', v_menu_item_id;
    end if;

    select name, available into v_item_name, v_item_available
    from menu_items
    where id = v_menu_item_id;

    if v_item_name is null then
      raise exception 'Menu item % not found', v_menu_item_id;
    end if;

    if not v_item_available then
      raise exception '% is currently unavailable', v_item_name;
    end if;

    if v_variant_id is not null then
      select label, price into v_variant_label, v_unit_price
      from menu_item_variants
      where id = v_variant_id and menu_item_id = v_menu_item_id;

      if v_unit_price is null then
        raise exception 'Variant % not found for %', v_variant_id, v_item_name;
      end if;
    else
      select price into v_unit_price
      from menu_items
      where id = v_menu_item_id;

      if v_unit_price is null then
        raise exception '% requires a variant selection', v_item_name;
      end if;

      v_variant_label := null;
    end if;

    -- trg_decrement_daily_stock fires here and raises its own exception
    -- ("Not enough stock remaining...") if this would oversell today's cap --
    -- that exception propagates up and rolls back the whole order, including
    -- the shell row inserted above.
    insert into order_items (
      order_id, menu_item_id, menu_item_name,
      variant_id, variant_label, unit_price, quantity
    ) values (
      new_order_id, v_menu_item_id, v_item_name,
      v_variant_id, v_variant_label, v_unit_price, v_quantity
    );

    running_total := running_total + (v_unit_price * v_quantity);
  end loop;

  update orders set total = running_total where id = new_order_id;

  return new_order_id;
end;
$$;

-- Students call this RPC directly rather than inserting into orders/order_items
-- themselves. Explicit grant needed since the function body bypasses RLS
-- (security definer) but the function itself must still be callable.
grant execute on function place_order(jsonb) to authenticated;