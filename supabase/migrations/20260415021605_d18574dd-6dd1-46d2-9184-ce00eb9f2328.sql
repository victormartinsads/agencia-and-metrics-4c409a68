
-- Add currency symbol to clients
ALTER TABLE public.clients ADD COLUMN currency_symbol text NOT NULL DEFAULT 'R$';

-- Table for manual metric overrides on creatives
CREATE TABLE public.creative_metric_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  creative_id text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, creative_id, metric_name)
);

ALTER TABLE public.creative_metric_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select creative_metric_overrides" ON public.creative_metric_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert creative_metric_overrides" ON public.creative_metric_overrides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update creative_metric_overrides" ON public.creative_metric_overrides FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete creative_metric_overrides" ON public.creative_metric_overrides FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_creative_metric_overrides_updated_at
  BEFORE UPDATE ON public.creative_metric_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
