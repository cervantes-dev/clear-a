-- Allow place_order() to bypass the student-update guard for its own
-- internal total-setting step, without weakening the guard for anything
-- a student does directly (e.g. via the Supabase client).
create or replace function guard_student_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_staff boolean;
begin
  -- place_order() sets this transaction-local flag right before its own
  -- internal "set total" update, so that specific step skips the guard.
  -- Any update NOT wrapped by place_order() never sets this, so a student
  -- calling `.update()` directly from the app still hits the full check below.
  if current_setting('app.order_guard_bypass', true) = 'on' then
    return new;
  end if;

  select exists (
    select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'staff'
  ) into is_staff;

  if is_staff then
    return new;
  end if;

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

-- Have place_order() set the bypass flag immediately before its total update
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

    insert into order_items (
      order_id, menu_item_id, menu_item_name,
      variant_id, variant_label, unit_price, quantity
    ) values (
      new_order_id, v_menu_item_id, v_item_name,
      v_variant_id, v_variant_label, v_unit_price, v_quantity
    );

    running_total := running_total + (v_unit_price * v_quantity);
  end loop;

  -- Bypass the student-update guard for this one internal update -- 'true'
  -- (is_local) means the setting automatically clears at end of transaction,
  -- so it can never leak into or affect any other query.
  perform set_config('app.order_guard_bypass', 'on', true);

  update orders set total = running_total where id = new_order_id;

  return new_order_id;
end;
$$;