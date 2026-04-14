
CREATE TABLE public.weekly_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_preset text NOT NULL DEFAULT 'last_7d',
  what_we_did text NOT NULL DEFAULT '',
  next_actions text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, date_preset)
);

ALTER TABLE public.weekly_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select weekly_notes" ON public.weekly_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert weekly_notes" ON public.weekly_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update weekly_notes" ON public.weekly_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete weekly_notes" ON public.weekly_notes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_weekly_notes_updated_at
  BEFORE UPDATE ON public.weekly_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
