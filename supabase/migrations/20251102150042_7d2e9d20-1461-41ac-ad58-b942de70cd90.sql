-- Make meal-images bucket public if not already
UPDATE storage.buckets 
SET public = true 
WHERE id = 'meal-images';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload meal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view meal images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete meal images" ON storage.objects;

-- Create RLS policies for meal-images bucket
CREATE POLICY "Authenticated users can upload meal images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meal-images');

CREATE POLICY "Anyone can view meal images"
ON storage.objects FOR SELECT
USING (bucket_id = 'meal-images');

CREATE POLICY "Admins can delete meal images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'meal-images' AND is_admin(auth.uid()));