
CREATE TABLE public.saved_diagnostics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  date_preset TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_diagnostics_client ON public.saved_diagnostics(client_id, created_at DESC);

ALTER TABLE public.saved_diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage saved_diagnostics"
  ON public.saved_diagnostics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read saved_diagnostics"
  ON public.saved_diagnostics
  FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER trg_saved_diagnostics_updated_at
  BEFORE UPDATE ON public.saved_diagnostics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
