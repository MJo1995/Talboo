/*
  # Enable Realtime on orders and order_items

  1. Changes
    - Add `orders` table to the `supabase_realtime` publication for live updates
    - Add `order_items` table to the `supabase_realtime` publication for live updates

  2. Important Notes
    - This enables the Kitchen Dashboard to receive instant notifications when new orders are placed
    - Status changes on orders will be broadcast in real time to all subscribed clients
    - Required for the customer-facing order tracking view
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
END $$;
