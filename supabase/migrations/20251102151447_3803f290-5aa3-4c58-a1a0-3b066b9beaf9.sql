-- Ensure 'meal-images' bucket exists and is public, and set proper storage policies (retry with correct pg_policies columns)
-- 1) Create bucket if missing and force it to public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'meal-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('meal-images', 'meal-images', true);
  END IF;

  -- Ensure bucket is public
  UPDATE storage.buckets SET public = true WHERE id = 'meal-images';
END $$;

-- 2) Create RLS policies on storage.objects for this bucket only
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view meal images'
  ) THEN
    CREATE POLICY "Public can view meal images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'meal-images');
  END IF;

  -- Authenticated upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload meal images'
  ) THEN
    CREATE POLICY "Authenticated can upload meal images"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'meal-images');
  END IF;

  -- Admins can delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete meal images'
  ) THEN
    CREATE POLICY "Admins can delete meal images"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'meal-images' AND public.is_admin(auth.uid()));
  END IF;
END $$;
