-- supabase/migrations/20260529_storage_orphans_cleanup.sql

CREATE OR REPLACE FUNCTION public.handle_storage_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_old_url text;
  v_new_url text;
  v_extracted_path text;
BEGIN
  -- 1. Identify which table triggered this
  IF TG_TABLE_NAME = 'menu_items' THEN
    v_old_url := OLD.image_url;
    IF TG_OP = 'UPDATE' THEN
      v_new_url := NEW.image_url;
    END IF;
  ELSIF TG_TABLE_NAME = 'restaurants' THEN
    v_old_url := OLD.logo_url;
    IF TG_OP = 'UPDATE' THEN
      v_new_url := NEW.logo_url;
    END IF;
  END IF;

  -- 2. Check if we need to proceed
  IF v_old_url IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_old_url IS NOT DISTINCT FROM v_new_url THEN
      RETURN NEW; -- URL didn't change
    END IF;
  END IF;

  -- 3. Extract the relative path.
  -- We split by '/menu-images/' and take the second portion.
  v_extracted_path := split_part(v_old_url, '/menu-images/', 2);

  -- 4. Delete the orphaned file from storage.objects
  IF v_extracted_path IS NOT NULL AND v_extracted_path != '' THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'menu-images' 
      AND name = v_extracted_path;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to menu_items
DROP TRIGGER IF EXISTS cleanup_menu_item_image ON public.menu_items;
CREATE TRIGGER cleanup_menu_item_image
  AFTER DELETE OR UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_cleanup();

-- Attach triggers to restaurants
DROP TRIGGER IF EXISTS cleanup_restaurant_logo ON public.restaurants;
CREATE TRIGGER cleanup_restaurant_logo
  AFTER DELETE OR UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_storage_cleanup();
