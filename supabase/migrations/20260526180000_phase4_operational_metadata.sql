-- Add operational metadata to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add kitchen session marker to restaurants
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS kitchen_reset_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Create an updated_at trigger for orders to automatically bump updated_at
CREATE OR REPLACE FUNCTION public.handle_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_orders_updated_at();

-- Update RPC create_order_atomic to respect the new schema if needed? No, RPC uses INSERT without specifying all columns.
