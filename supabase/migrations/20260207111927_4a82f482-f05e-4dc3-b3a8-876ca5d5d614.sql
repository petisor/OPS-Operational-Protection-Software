-- Create storage bucket for machine manuals
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-manuals', 'machine-manuals', false)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload manuals
CREATE POLICY "Admins can upload manuals"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'machine-manuals' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update manuals
CREATE POLICY "Admins can update manuals"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'machine-manuals' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete manuals
CREATE POLICY "Admins can delete manuals"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'machine-manuals' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow authenticated users to read manuals
CREATE POLICY "Authenticated users can read manuals"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'machine-manuals' 
  AND auth.role() = 'authenticated'
);