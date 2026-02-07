-- Add employer_id to profiles table for admin-worker relationship
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employer_id text UNIQUE;

-- Create machine_visuals table for admin-approved images
CREATE TABLE public.machine_visuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text NOT NULL,
  description text,
  is_approved boolean NOT NULL DEFAULT false,
  approved_at timestamp with time zone,
  approved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create machine_manuals table for uploaded manuals
CREATE TABLE public.machine_manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.machine_visuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_manuals ENABLE ROW LEVEL SECURITY;

-- RLS policies for machine_visuals
CREATE POLICY "Admins can manage visuals" ON public.machine_visuals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view approved visuals" ON public.machine_visuals
FOR SELECT USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for machine_manuals
CREATE POLICY "Admins can manage manuals" ON public.machine_manuals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view manuals" ON public.machine_manuals
FOR SELECT USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_machine_visuals_updated_at
BEFORE UPDATE ON public.machine_visuals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique employer_id for new admins
CREATE OR REPLACE FUNCTION public.generate_employer_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric ID
    new_id := upper(substr(md5(random()::text), 1, 8));
    -- Check if it already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE employer_id = new_id) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_id;
END;
$$;

-- Update handle_new_user to generate employer_id for admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_full_name text;
  user_employee_id text;
  user_employer_id text;
  new_employer_id text;
BEGIN
  -- Get role from user metadata, default to 'user'
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role,
    'user'::app_role
  );
  
  -- Get full name from metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    'Unknown'
  );
  
  -- Get employee_id from metadata (can be null)
  user_employee_id := NEW.raw_user_meta_data->>'employee_id';
  
  -- Get employer_id from metadata (for workers linking to admin)
  user_employer_id := NEW.raw_user_meta_data->>'employer_id';
  
  -- Generate employer_id for admins
  IF user_role = 'admin' THEN
    new_employer_id := generate_employer_id();
  ELSE
    new_employer_id := NULL;
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name, employee_id, employer_id)
  VALUES (NEW.id, user_full_name, 
    CASE WHEN user_role = 'user' THEN user_employer_id ELSE user_employee_id END,
    new_employer_id);
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$function$;