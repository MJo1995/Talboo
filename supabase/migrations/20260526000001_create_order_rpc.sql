/*
  # Create Atomic Order RPC

  1. Purpose
    - Replaces sequential client-side inserts with a single atomic transaction.
    - Eliminates the realtime race condition where the kitchen dashboard 
      fetches order_items before they are completely inserted.

  2. Security
    - Uses SECURITY INVOKER so the function executes with the privileges of the caller (e.g. anon).
    - Automatically enforces the strict RLS policies we established for orders and order_items.
    - Any RLS failure or malformed payload will throw an exception, rolling back the entire transaction.
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
BEGIN
  -- 1. Create the order
  -- RLS will enforce that p_table_id belongs to p_restaurant_id
  INSERT INTO public.orders (restaurant_id, table_id, total_amount, status)
  VALUES (p_restaurant_id, p_table_id, p_total_amount, 'pending')
  RETURNING id INTO v_order_id;

  -- 2. Iterate through items and insert them
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_notes := v_item->>'notes';

    -- RLS will enforce that v_menu_item_id belongs to the same restaurant as the order
    INSERT INTO public.order_items (order_id, menu_item_id, quantity, notes)
    VALUES (v_order_id, v_menu_item_id, v_quantity, v_notes);
  END LOOP;

  -- 3. Return the new order ID if the entire transaction succeeds
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Restrict execution to explicitly allowed roles
REVOKE EXECUTE ON FUNCTION public.create_order_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated;
