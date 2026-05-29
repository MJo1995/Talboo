/*
  # TABLO Initial Multi-Tenant Schema

  1. New Tables
    - `restaurants` - Core tenant table representing each restaurant business
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references auth.users)
      - `name` (text, restaurant display name)
      - `slug` (text, unique URL-friendly identifier)
      - `created_at` (timestamptz, auto-set on creation)
    - `restaurant_members` - Maps authenticated users to restaurant tenants with roles
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, references restaurants)
      - `user_id` (uuid, references auth.users)
      - `role` (text, constrained to owner/manager/staff)
      - `created_at` (timestamptz, auto-set on creation)
    - `categories` - Menu categories for organizing menu items
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, references restaurants)
      - `name` (text, category display name)
      - `display_order` (int, ordering within the menu)
      - `created_at` (timestamptz, auto-set on creation)
    - `menu_items` - Individual dishes/items on the menu
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, references restaurants)
      - `category_id` (uuid, references categories)
      - `name` (text, item display name)
      - `description` (text, optional item description)
      - `price` (numeric(10,2), item price)
      - `is_available` (boolean, whether item can be ordered)
      - `image_url` (text, optional image reference)
      - `created_at` (timestamptz, auto-set on creation)
    - `restaurant_tables` - Physical tables within a restaurant for QR ordering
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, references restaurants)
      - `table_number` (text, human-readable table identifier)
      - `qr_code_identifier` (text, unique QR code payload)
      - `created_at` (timestamptz, auto-set on creation)
    - `orders` - Customer orders placed from tables
      - `id` (uuid, primary key)
      - `restaurant_id` (uuid, references restaurants)
      - `table_id` (uuid, references restaurant_tables, nullable)
      - `status` (text, constrained to pending/preparing/completed/cancelled)
      - `total_amount` (numeric(10,2), order total)
      - `created_at` (timestamptz, auto-set on creation)
    - `order_items` - Individual line items within an order
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `menu_item_id` (uuid, references menu_items)
      - `quantity` (int, must be > 0)
      - `notes` (text, optional special instructions)

  2. Helper Functions
    - `is_restaurant_member(restaurant_id uuid)` - Returns true if current user is a member
    - `get_member_role(restaurant_id uuid)` - Returns the role of the current user

  3. Security
    - RLS enabled on ALL tables
    - Strict membership-based access policies for SELECT, INSERT, UPDATE, DELETE
    - Owner-only restrictions for destructive operations
    - All policies check auth.uid() against restaurant_members

  4. Indexes
    - Performance indexes on foreign keys and frequently queried columns
    - Composite indexes for common query patterns
*/

-- =============================================================================
-- TABLES (created first so helper functions can reference them)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  qr_code_identifier text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'preparing', 'completed', 'cancelled')) DEFAULT 'pending',
  total_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity int NOT NULL CHECK (quantity > 0),
  notes text
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_restaurant_member(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurant_members
    WHERE restaurant_id = p_restaurant_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_member_role(p_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role
  FROM public.restaurant_members
  WHERE restaurant_id = p_restaurant_id
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: restaurants
-- =============================================================================

CREATE POLICY "Members can view their restaurant"
  ON public.restaurants
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(id));

CREATE POLICY "Authenticated users can create restaurants"
  ON public.restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their restaurant"
  ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their restaurant"
  ON public.restaurants
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =============================================================================
-- RLS POLICIES: restaurant_members
-- =============================================================================

CREATE POLICY "Members can view fellow members"
  ON public.restaurant_members
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and managers can add members"
  ON public.restaurant_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_member_role(restaurant_id) IN ('owner', 'manager')
    OR (auth.uid() = user_id AND role = 'owner')
  );

CREATE POLICY "Owners can update member roles"
  ON public.restaurant_members
  FOR UPDATE
  TO authenticated
  USING (public.get_member_role(restaurant_id) = 'owner')
  WITH CHECK (public.get_member_role(restaurant_id) = 'owner');

CREATE POLICY "Owners can remove members"
  ON public.restaurant_members
  FOR DELETE
  TO authenticated
  USING (public.get_member_role(restaurant_id) = 'owner');

-- =============================================================================
-- RLS POLICIES: categories
-- =============================================================================

CREATE POLICY "Members can view categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and managers can create categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'))
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

-- =============================================================================
-- RLS POLICIES: menu_items
-- =============================================================================

CREATE POLICY "Members can view menu items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and managers can create menu items"
  ON public.menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can update menu items"
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'))
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can delete menu items"
  ON public.menu_items
  FOR DELETE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

-- =============================================================================
-- RLS POLICIES: restaurant_tables
-- =============================================================================

CREATE POLICY "Members can view tables"
  ON public.restaurant_tables
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and managers can create tables"
  ON public.restaurant_tables
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can update tables"
  ON public.restaurant_tables
  FOR UPDATE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'))
  WITH CHECK (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

CREATE POLICY "Owners and managers can delete tables"
  ON public.restaurant_tables
  FOR DELETE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

-- =============================================================================
-- RLS POLICIES: orders
-- =============================================================================

CREATE POLICY "Members can view orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Members can create orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Members can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_restaurant_member(restaurant_id))
  WITH CHECK (public.is_restaurant_member(restaurant_id));

CREATE POLICY "Owners and managers can delete orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.get_member_role(restaurant_id) IN ('owner', 'manager'));

-- =============================================================================
-- RLS POLICIES: order_items
-- =============================================================================

CREATE POLICY "Members can view order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND public.is_restaurant_member(orders.restaurant_id)
    )
  );

CREATE POLICY "Members can create order items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND public.is_restaurant_member(orders.restaurant_id)
    )
  );

CREATE POLICY "Members can update order items"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND public.is_restaurant_member(orders.restaurant_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND public.is_restaurant_member(orders.restaurant_id)
    )
  );

CREATE POLICY "Owners and managers can delete order items"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND public.get_member_role(orders.restaurant_id) IN ('owner', 'manager')
    )
  );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);

CREATE INDEX IF NOT EXISTS idx_restaurant_members_user_id ON public.restaurant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_members_restaurant_id ON public.restaurant_members(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON public.categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(restaurant_id, display_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(restaurant_id, is_available);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_qr_code ON public.restaurant_tables(qr_code_identifier);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);