-- Tabela para personalização das métricas exibidas por grupo (funil/campanha) no Diagnóstico Semanal
CREATE TABLE public.diagnostic_metrics_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  date_preset TEXT NOT NULL DEFAULT 'last_7d',
  group_key TEXT NOT NULL, -- chave do funil/campanha (ex: "Workshop" ou nome da campanha) ou "__global__"
  visible_metrics JSONB NOT NULL DEFAULT '["spend","conversions","cpa","ctr","cpm","reach"]'::jsonb,
  custom_metrics JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{id, label, value, format}]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, date_preset, group_key)
);

ALTER TABLE public.diagnostic_metrics_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages diagnostic_metrics_config"
  ON public.diagnostic_metrics_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_diagnostic_metrics_config_updated_at
  BEFORE UPDATE ON public.diagnostic_metrics_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_diagnostic_metrics_config_lookup
  ON public.diagnostic_metrics_config (client_id, date_preset, group_key);