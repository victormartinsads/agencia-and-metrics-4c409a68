CREATE TABLE IF NOT EXISTS public.funnel_manual_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  metric_label text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  metric_format text NOT NULL DEFAULT 'number',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_manual_metrics_client_funnel_idx
  ON public.funnel_manual_metrics(client_id, funnel_code);

ALTER TABLE public.funnel_manual_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read funnel_manual_metrics"
  ON public.funnel_manual_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Auth manage funnel_manual_metrics"
  ON public.funnel_manual_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER funnel_manual_metrics_updated_at
  BEFORE UPDATE ON public.funnel_manual_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();