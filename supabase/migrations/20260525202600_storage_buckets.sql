-- Create "menu-images" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'menu-images',
    'menu-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Public select (anyone can read the images)
CREATE POLICY "Public Read Menu Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Insert/Upload (must be member of the restaurant)
CREATE POLICY "Upload Menu Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'menu-images' AND
    -- Path format: restaurant_id/uuid.ext
    (storage.foldername(name))[1] IS NOT NULL AND
    public.get_member_role((storage.foldername(name))[1]::uuid) IS NOT NULL
);

-- Update (must be member of the restaurant)
CREATE POLICY "Update Menu Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'menu-images' AND
    (storage.foldername(name))[1] IS NOT NULL AND
    public.get_member_role((storage.foldername(name))[1]::uuid) IS NOT NULL
);

-- Delete (must be member of the restaurant)
CREATE POLICY "Delete Menu Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'menu-images' AND
    (storage.foldername(name))[1] IS NOT NULL AND
    public.get_member_role((storage.foldername(name))[1]::uuid) IS NOT NULL
);
