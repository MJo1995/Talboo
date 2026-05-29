-- supabase/migrations/20260529_enforce_unique_pin.sql

-- Ensure that no two restaurants can have the same kitchen PIN
ALTER TABLE public.restaurants ADD CONSTRAINT unique_kitchen_pin UNIQUE (kitchen_pin);
