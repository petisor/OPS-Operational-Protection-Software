-- Create table for AI-generated machine instructions
CREATE TABLE public.machine_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI-generated warnings that need admin approval
CREATE TABLE public.machine_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track user warning acknowledgments
CREATE TABLE public.user_warning_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  warning_id UUID NOT NULL REFERENCES public.machine_warnings(id) ON DELETE CASCADE,
  read_acknowledged BOOLEAN NOT NULL DEFAULT false,
  liability_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, warning_id)
);

-- Create table to track user learning progress per machine
CREATE TABLE public.user_learning_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  instructions_completed BOOLEAN NOT NULL DEFAULT false,
  instructions_completed_at TIMESTAMP WITH TIME ZONE,
  warnings_completed BOOLEAN NOT NULL DEFAULT false,
  warnings_completed_at TIMESTAMP WITH TIME ZONE,
  quiz_unlocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, machine_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.machine_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warning_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for machine_instructions
CREATE POLICY "Anyone can view instructions"
ON public.machine_instructions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage instructions"
ON public.machine_instructions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for machine_warnings
CREATE POLICY "Users can view approved warnings"
ON public.machine_warnings FOR SELECT
USING (is_approved = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage warnings"
ON public.machine_warnings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_warning_acknowledgments
CREATE POLICY "Users can view own acknowledgments"
ON public.user_warning_acknowledgments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acknowledgments"
ON public.user_warning_acknowledgments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own acknowledgments"
ON public.user_warning_acknowledgments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all acknowledgments"
ON public.user_warning_acknowledgments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_learning_progress
CREATE POLICY "Users can view own progress"
ON public.user_learning_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_learning_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_learning_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
ON public.user_learning_progress FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_machine_instructions_updated_at
BEFORE UPDATE ON public.machine_instructions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_warnings_updated_at
BEFORE UPDATE ON public.machine_warnings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_learning_progress_updated_at
BEFORE UPDATE ON public.user_learning_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();