CREATE TABLE public.weekly_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  date_preset TEXT NOT NULL DEFAULT 'last_7d',
  positives TEXT NOT NULL DEFAULT '',
  negatives TEXT NOT NULL DEFAULT '',
  manager_actions TEXT NOT NULL DEFAULT '',
  client_requests TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, date_preset)
);

ALTER TABLE public.weekly_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select weekly_diagnostics"
  ON public.weekly_diagnostics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth insert weekly_diagnostics"
  ON public.weekly_diagnostics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth update weekly_diagnostics"
  ON public.weekly_diagnostics FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth delete weekly_diagnostics"
  ON public.weekly_diagnostics FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role manages weekly_diagnostics"
  ON public.weekly_diagnostics FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_weekly_diagnostics_updated_at
  BEFORE UPDATE ON public.weekly_diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_weekly_diagnostics_client_preset ON public.weekly_diagnostics(client_id, date_preset);