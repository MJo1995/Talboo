-- Add branding image columns to restaurants
-- Both are nullable: restaurants work fine without branding (existing fallback UI)
-- Images are stored in the existing "menu-images" Supabase Storage bucket
-- and the public URL is saved here.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
