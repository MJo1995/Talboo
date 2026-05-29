-- 1. Create a detailed debug version of the RPC
CREATE OR REPLACE FUNCTION public.provision_kitchen_device(p_restaurant_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_owner boolean;
  v_email text;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Verify caller is owner or manager OF THIS SPECIFIC RESTAURANT
  SELECT true INTO v_is_owner
  FROM public.restaurant_members
  WHERE restaurant_id = p_restaurant_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'manager')
  LIMIT 1;

  IF v_is_owner IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Access denied: User is not an owner or manager of this restaurant.',
      'step', 'verify_owner'
    );
  END IF;

  v_email := 'kitchen-' || p_restaurant_id || '@tablo.app';

  -- Update kitchen_access_code on restaurant
  UPDATE public.restaurants 
  SET kitchen_access_code = p_code 
  WHERE id = p_restaurant_id;

  -- Check if kitchen user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    
    -- Insert new auth user OMITTING instance_id so it defaults to the project's real instance
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_super_admin, is_sso_user
    )
    VALUES (
      v_user_id, 'authenticated', 'authenticated', v_email, 
      extensions.crypt(p_code, extensions.gen_salt('bf')), now(), 
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      false, false
    );

    -- Insert required identity for email/password login
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb, 'email', v_user_id::text, now(), now(), now()
    );

    v_result := jsonb_build_object(
      'success', true, 
      'action', 'created_user', 
      'user_id', v_user_id,
      'email', v_email,
      'step', 'insert_auth_users'
    );
  ELSE
    -- Atomically update existing kitchen user password
    UPDATE auth.users 
    SET encrypted_password = extensions.crypt(p_code, extensions.gen_salt('bf')) 
    WHERE id = v_user_id;

    v_result := jsonb_build_object(
      'success', true, 
      'action', 'updated_password', 
      'user_id', v_user_id,
      'email', v_email,
      'step', 'update_auth_users'
    );
  END IF;

  -- Ensure restaurant_members mapping exists
  INSERT INTO public.restaurant_members (restaurant_id, user_id, role)
  VALUES (p_restaurant_id, v_user_id, 'staff')
  ON CONFLICT (restaurant_id, user_id) DO NOTHING;

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- Catch any postgres error, roll back transaction, and return exactly what failed
  RETURN jsonb_build_object(
    'success', false, 
    'error', SQLERRM, 
    'detail', SQLSTATE,
    'step', 'exception_handler'
  );
END;
$$;
