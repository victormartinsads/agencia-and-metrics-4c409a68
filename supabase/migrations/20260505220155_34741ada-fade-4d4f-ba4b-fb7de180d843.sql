-- 1) Mapeamento de eventos da Meta que contam como "Seguidor" por funil
CREATE TABLE IF NOT EXISTS public.funnel_follow_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  action_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code)
);
ALTER TABLE public.funnel_follow_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage funnel_follow_mapping" ON public.funnel_follow_mapping
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read funnel_follow_mapping" ON public.funnel_follow_mapping
  FOR SELECT TO anon, authenticated USING (true);

-- 2) Override manual de métricas exibidas no card de funil
CREATE TABLE IF NOT EXISTS public.funnel_metric_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code, metric_key)
);
ALTER TABLE public.funnel_metric_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage funnel_metric_overrides" ON public.funnel_metric_overrides
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read funnel_metric_overrides" ON public.funnel_metric_overrides
  FOR SELECT TO anon, authenticated USING (true);