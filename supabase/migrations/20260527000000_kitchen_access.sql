-- Add kitchen access code to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS kitchen_access_code TEXT UNIQUE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Provision a persistent kitchen device account
CREATE OR REPLACE FUNCTION public.provision_kitchen_device(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id uuid;
  v_email text;
  v_user_id uuid;
BEGIN
  -- Verify caller is owner or manager
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.restaurant_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
  LIMIT 1;

  IF v_restaurant_id IS NULL THEN
    RETURN false;
  END IF;

  v_email := 'kitchen-' || v_restaurant_id || '@tablo.app';

  -- Update kitchen_access_code on restaurant
  UPDATE public.restaurants 
  SET kitchen_access_code = p_code 
  WHERE id = v_restaurant_id;

  -- Check if kitchen user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    -- Insert new auth user with the hashed code as password
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role
    )
    VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', v_email, 
      crypt(p_code, gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated'
    );
  ELSE
    -- Atomically update existing kitchen user password
    UPDATE auth.users 
    SET encrypted_password = crypt(p_code, gen_salt('bf')) 
    WHERE id = v_user_id;
  END IF;

  -- Ensure restaurant_members mapping exists
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (v_restaurant_id, v_user_id, 'staff')
  ON CONFLICT (restaurant_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- Get the email associated with a kitchen code for login
CREATE OR REPLACE FUNCTION public.get_kitchen_device_email(p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  SELECT id INTO v_restaurant_id
  FROM public.restaurants
  WHERE kitchen_access_code = p_code;

  IF v_restaurant_id IS NULL THEN
    RETURN null;
  END IF;

  RETURN 'kitchen-' || v_restaurant_id || '@tablo.app';
END;
$$;
