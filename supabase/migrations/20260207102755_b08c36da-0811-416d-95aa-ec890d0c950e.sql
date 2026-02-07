-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  employee_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'truck',
  common_injury TEXT NOT NULL DEFAULT 'General Hazard',
  safety_warning TEXT NOT NULL DEFAULT 'Follow all safety protocols',
  manual_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety questions table
CREATE TABLE public.safety_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create machine_access table (which users can access which machines)
CREATE TABLE public.machine_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, machine_id)
);

-- Create safety_logs table
CREATE TABLE public.safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'safe',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Machines policies
CREATE POLICY "Admins can manage machines" ON public.machines
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view accessible machines" ON public.machines
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.machine_access
      WHERE machine_access.machine_id = machines.id
      AND machine_access.user_id = auth.uid()
    )
  );

-- Safety questions policies
CREATE POLICY "Anyone can view questions" ON public.safety_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.safety_questions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Machine access policies
CREATE POLICY "Admins can manage access" ON public.machine_access
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own access" ON public.machine_access
  FOR SELECT USING (auth.uid() = user_id);

-- Safety logs policies
CREATE POLICY "Users can insert own logs" ON public.safety_logs
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can view own logs" ON public.safety_logs
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Admins can view all logs" ON public.safety_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default machines with questions
INSERT INTO public.machines (name, description, icon, common_injury, safety_warning) VALUES
  ('Excavator', 'Heavy construction equipment for digging', 'construction', 'Crushing Hazard', 'Ensure swing area is clear of personnel. Check all blind spots.'),
  ('Forklift', 'Industrial truck for lifting materials', 'truck', 'Tip-over & Struck-by', 'Check load capacity. Never exceed rated weight. Ensure clear path.'),
  ('Bulldozer', 'Track-type tractor for pushing material', 'tractor', 'Run-over & Crushing', 'Check brakes and steering. Clear area of personnel before operation.');

-- Insert safety questions for each machine
INSERT INTO public.safety_questions (machine_id, question, order_index) 
SELECT id, 'Is the swing-lock pin engaged?', 1 FROM public.machines WHERE name = 'Excavator'
UNION ALL
SELECT id, 'Are all mirrors and cameras functional?', 2 FROM public.machines WHERE name = 'Excavator'
UNION ALL
SELECT id, 'Is the bucket secured properly?', 3 FROM public.machines WHERE name = 'Excavator'
UNION ALL
SELECT id, 'Are hydraulic hoses free from leaks?', 4 FROM public.machines WHERE name = 'Excavator'
UNION ALL
SELECT id, 'Is the surrounding area clear of personnel?', 5 FROM public.machines WHERE name = 'Excavator';

INSERT INTO public.safety_questions (machine_id, question, order_index)
SELECT id, 'Are the forks level and undamaged?', 1 FROM public.machines WHERE name = 'Forklift'
UNION ALL
SELECT id, 'Is the load backrest secure?', 2 FROM public.machines WHERE name = 'Forklift'
UNION ALL
SELECT id, 'Are brakes functioning properly?', 3 FROM public.machines WHERE name = 'Forklift'
UNION ALL
SELECT id, 'Is the horn and backup alarm working?', 4 FROM public.machines WHERE name = 'Forklift'
UNION ALL
SELECT id, 'Is seatbelt in good condition?', 5 FROM public.machines WHERE name = 'Forklift';

INSERT INTO public.safety_questions (machine_id, question, order_index)
SELECT id, 'Are tracks in good condition?', 1 FROM public.machines WHERE name = 'Bulldozer'
UNION ALL
SELECT id, 'Is the blade secured in travel position?', 2 FROM public.machines WHERE name = 'Bulldozer'
UNION ALL
SELECT id, 'Are all gauges reading normal?', 3 FROM public.machines WHERE name = 'Bulldozer'
UNION ALL
SELECT id, 'Is the rollover protection intact?', 4 FROM public.machines WHERE name = 'Bulldozer'
UNION ALL
SELECT id, 'Are fire extinguishers present and charged?', 5 FROM public.machines WHERE name = 'Bulldozer';