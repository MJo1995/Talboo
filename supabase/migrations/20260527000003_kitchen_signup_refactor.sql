-- 1. Function to prepare the DB by deleting the old user and saving the code
CREATE OR REPLACE FUNCTION public.prepare_kitchen_device(p_restaurant_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_owner boolean;
  v_email text;
BEGIN
  -- Verify caller is owner or manager OF THIS SPECIFIC RESTAURANT
  SELECT true INTO v_is_owner
  FROM public.restaurant_members
  WHERE restaurant_id = p_restaurant_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'manager')
  LIMIT 1;

  IF v_is_owner IS NULL THEN
    RAISE EXCEPTION 'Access denied: User is not an owner or manager of this restaurant.';
  END IF;

  v_email := 'kitchen-' || p_restaurant_id || '@tablo.app';

  -- Delete any existing kitchen user so we can sign up fresh
  -- (This naturally cascades to restaurant_members for the old user)
  DELETE FROM auth.users WHERE email = v_email;

  -- Update kitchen_access_code on restaurant
  UPDATE public.restaurants 
  SET kitchen_access_code = p_code 
  WHERE id = p_restaurant_id;

  RETURN true;
END;
$$;


-- 2. Function to bind the newly signed-up user to the restaurant
CREATE OR REPLACE FUNCTION public.bind_kitchen_device(p_restaurant_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  -- Verify caller is owner or manager OF THIS SPECIFIC RESTAURANT
  SELECT true INTO v_is_owner
  FROM public.restaurant_members
  WHERE restaurant_id = p_restaurant_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'manager')
  LIMIT 1;

  IF v_is_owner IS NULL THEN
    RAISE EXCEPTION 'Access denied: User is not an owner or manager of this restaurant.';
  END IF;

  -- Ensure restaurant_members mapping exists
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (p_restaurant_id, p_user_id, 'staff')
  ON CONFLICT (restaurant_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;
