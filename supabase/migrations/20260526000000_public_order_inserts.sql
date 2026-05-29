/*
  # Add public insert policies for QR ordering

  1. Security Changes
    - Add INSERT policy on `orders` for `anon` role - allows customers to place orders at a valid table.
    - Add INSERT policy on `order_items` for `anon` role - allows customers to add items to their pending orders.

  2. Important Notes
    - The `orders` policy strictly validates that the `table_id` provided exists and belongs to the specified `restaurant_id`.
    - The `order_items` policy validates that the parent `order_id` exists and is still in the 'pending' status.
    - Since UUIDs are unguessable, requiring the `order_id` is sufficient protection against cross-order manipulation by anonymous users.
*/

CREATE POLICY "Public can create orders"
  ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (
    table_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.restaurant_tables
      WHERE id = table_id AND restaurant_id = orders.restaurant_id
    )
  );

CREATE POLICY "Public can create order items"
  ON public.order_items
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.menu_items m ON m.restaurant_id = o.restaurant_id
      WHERE o.id = order_items.order_id 
        AND m.id = order_items.menu_item_id
        AND o.status = 'pending'
    )
  );
