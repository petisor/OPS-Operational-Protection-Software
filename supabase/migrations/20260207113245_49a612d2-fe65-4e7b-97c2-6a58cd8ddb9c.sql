-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  user_full_name text;
  user_employee_id text;
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
  
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name, employee_id)
  VALUES (NEW.id, user_full_name, user_employee_id);
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();