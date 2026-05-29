/*
  # Add public read policies for QR menu viewer

  1. Security Changes
    - Add SELECT policy on `restaurants` for `anon` role - allows looking up restaurant by slug
    - Add SELECT policy on `categories` for `anon` role - allows viewing menu categories
    - Add SELECT policy on `menu_items` for `anon` role - allows viewing available items
    - Add SELECT policy on `restaurant_tables` for `anon` role - allows validating table QR codes

  2. Important Notes
    - These policies enable the public-facing QR code menu to work without authentication
    - All policies are read-only (SELECT) and scoped to the anon role
    - Menu items policy only exposes available items (is_available = true)
    - No sensitive data is exposed through these policies
*/

CREATE POLICY "Public can view restaurants by slug"
  ON restaurants
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view categories for menu"
  ON categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view available menu items"
  ON menu_items
  FOR SELECT
  TO anon
  USING (is_available = true);

CREATE POLICY "Public can validate table QR codes"
  ON restaurant_tables
  FOR SELECT
  TO anon
  USING (true);
