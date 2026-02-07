-- Add extracted content column to machine_manuals
ALTER TABLE public.machine_manuals 
ADD COLUMN IF NOT EXISTS extracted_content text;

-- Create table for pre-compiled Q&A pairs from manuals
CREATE TABLE IF NOT EXISTS public.machine_manual_qa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  manual_id uuid REFERENCES public.machine_manuals(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machine_manual_qa ENABLE ROW LEVEL SECURITY;

-- Policies for machine_manual_qa
CREATE POLICY "Admins can manage Q&A" 
ON public.machine_manual_qa 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view Q&A" 
ON public.machine_manual_qa 
FOR SELECT 
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manual_qa_machine_id ON public.machine_manual_qa(machine_id);