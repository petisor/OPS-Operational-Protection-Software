-- Add correct_answer boolean to safety_questions (true = YES is correct, false = NO is correct)
ALTER TABLE public.safety_questions 
ADD COLUMN correct_answer boolean NOT NULL DEFAULT true;

-- Add category to safety_questions (safety vs usage)
CREATE TYPE public.question_category AS ENUM ('safety', 'usage');

ALTER TABLE public.safety_questions 
ADD COLUMN category question_category NOT NULL DEFAULT 'safety';

-- Add recertification settings to machines
ALTER TABLE public.machines 
ADD COLUMN recertification_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.machines 
ADD COLUMN question_count integer NOT NULL DEFAULT 5;

-- Add score tracking to safety_logs
ALTER TABLE public.safety_logs 
ADD COLUMN correct_answers integer DEFAULT 0;

ALTER TABLE public.safety_logs 
ADD COLUMN total_questions integer DEFAULT 0;

ALTER TABLE public.safety_logs 
ADD COLUMN category question_category DEFAULT 'safety';

-- Create employee_warnings table
CREATE TABLE public.employee_warnings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE CASCADE,
  message text NOT NULL,
  warning_type text NOT NULL DEFAULT 'incomplete_check',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on employee_warnings
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all warnings
CREATE POLICY "Admins can manage warnings"
ON public.employee_warnings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own warnings
CREATE POLICY "Users can view own warnings"
ON public.employee_warnings
FOR SELECT
USING (auth.uid() = employee_id);

-- Users can update (mark as read) their own warnings
CREATE POLICY "Users can update own warnings"
ON public.employee_warnings
FOR UPDATE
USING (auth.uid() = employee_id);