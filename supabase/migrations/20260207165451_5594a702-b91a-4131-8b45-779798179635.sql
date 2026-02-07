-- First add the created_by column
ALTER TABLE public.machines 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop ALL existing policies on machines to start fresh
DROP POLICY IF EXISTS "Admins can manage machines " ON public.machines;
DROP POLICY IF EXISTS "Users can view accessible machines " ON public.machines;
DROP POLICY IF EXISTS "Admins can manage own machines" ON public.machines;
DROP POLICY IF EXISTS "Users can view accessible machines" ON public.machines;
DROP POLICY IF EXISTS "Users view accessible machines" ON public.machines;

-- Admins can only manage machines they created
CREATE POLICY "Admins manage own machines"
ON public.machines
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (created_by = auth.uid() OR created_by IS NULL)
);

-- Users can view machines they have access to 
CREATE POLICY "Workers view accessible machines"
ON public.machines
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM machine_access
    WHERE machine_access.machine_id = machines.id
    AND machine_access.user_id = auth.uid()
  )
);

-- Make the machine-manuals bucket public so images can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'machine-manuals';

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public can view machine manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload machine manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete machine manuals" ON storage.objects;

-- Add storage policies for public read access
CREATE POLICY "Public view machine manuals"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'machine-manuals');

-- Admins can upload to machine-manuals bucket
CREATE POLICY "Admins upload machine manuals"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'machine-manuals' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can delete from machine-manuals bucket
CREATE POLICY "Admins delete machine manuals"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'machine-manuals' AND
  has_role(auth.uid(), 'admin'::app_role)
);