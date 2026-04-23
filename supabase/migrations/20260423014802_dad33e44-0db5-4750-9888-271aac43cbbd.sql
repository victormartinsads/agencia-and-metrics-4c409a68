CREATE TABLE IF NOT EXISTS public.dashboard_metric_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  source text NOT NULL DEFAULT 'sheets',
  column_letter text,
  field_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_key)
);

ALTER TABLE public.dashboard_metric_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select dashboard_metric_sources"
  ON public.dashboard_metric_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert dashboard_metric_sources"
  ON public.dashboard_metric_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update dashboard_metric_sources"
  ON public.dashboard_metric_sources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete dashboard_metric_sources"
  ON public.dashboard_metric_sources FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_dashboard_metric_sources_updated_at
  BEFORE UPDATE ON public.dashboard_metric_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dashboard_metric_sources_client ON public.dashboard_metric_sources(client_id);