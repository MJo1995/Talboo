-- 1. Add kitchen_pin column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS kitchen_pin TEXT;

-- 2. Create verify_kitchen_pin RPC
CREATE OR REPLACE FUNCTION public.verify_kitchen_pin(provided_pin TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_restaurant_id uuid;
  v_user_id uuid;
BEGIN
  -- Check if pin exists
  SELECT id INTO v_restaurant_id
  FROM public.restaurants
  WHERE kitchen_pin = provided_pin
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid Kitchen PIN.';
  END IF;

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated anonymously.';
  END IF;

  -- Insert or update restaurant_members mapping
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (v_restaurant_id, v_user_id, 'staff')
  ON CONFLICT (restaurant_id, user_id) 
  DO UPDATE SET role = 'staff';

  RETURN v_restaurant_id;
END;
$$;
