/*
  # Fix Atomic Order RPC Security Context

  1. Purpose
    - Changes the RPC from SECURITY INVOKER to SECURITY DEFINER.
    - Prevents the 'Failed to place order' error caused by the 'anon' role
      lacking SELECT permissions on the orders table.

  2. Security
    - Because SECURITY DEFINER bypasses RLS, we explicitly perform the
      tenant boundary checks (table ownership and menu item ownership)
      manually inside the function body.
    - search_path is strictly set to public to prevent path injection attacks.
*/

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_total_amount numeric,
  p_items jsonb
) RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
  v_notes text;
  v_valid_table boolean;
  v_valid_item boolean;
BEGIN
  -- 1. Validate that the table actually belongs to the restaurant
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_tables
    WHERE id = p_table_id AND restaurant_id = p_restaurant_id
  ) INTO v_valid_table;

  IF NOT v_valid_table THEN
    RAISE EXCEPTION 'Invalid table or restaurant mismatch';
  END IF;

  -- 2. Create the order
  INSERT INTO public.orders (restaurant_id, table_id, total_amount, status)
  VALUES (p_restaurant_id, p_table_id, p_total_amount, 'pending')
  RETURNING id INTO v_order_id;

  -- 3. Iterate through items and insert them
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_notes := v_item->>'notes';

    -- 4. Validate that the menu item actually belongs to the restaurant
    SELECT EXISTS (
      SELECT 1 FROM public.menu_items
      WHERE id = v_menu_item_id AND restaurant_id = p_restaurant_id
    ) INTO v_valid_item;

    IF NOT v_valid_item THEN
      RAISE EXCEPTION 'Menu item mismatch or invalid tenant';
    END IF;

    -- Insert order item
    INSERT INTO public.order_items (order_id, menu_item_id, quantity, notes)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_notes);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
