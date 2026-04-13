
CREATE TABLE public.funnel_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  date_preset TEXT NOT NULL DEFAULT 'last_7d',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_funnel_notes_client_preset ON public.funnel_notes (client_id, date_preset);

ALTER TABLE public.funnel_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read funnel notes"
ON public.funnel_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert funnel notes"
ON public.funnel_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update funnel notes"
ON public.funnel_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete funnel notes"
ON public.funnel_notes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_funnel_notes_updated_at
BEFORE UPDATE ON public.funnel_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
