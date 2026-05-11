
-- Thresholds de alerta por cliente
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS target_cpa_lead numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_cpa_purchase numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpa_alert_multiplier numeric DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS budget_alert_threshold_pct numeric DEFAULT 90;

-- Sugestões de otimização
CREATE TABLE IF NOT EXISTS public.optimization_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  level text NOT NULL,                 -- campaign | adset | ad
  object_id text NOT NULL,
  object_name text,
  action text NOT NULL,                -- pause | activate | increase_budget | decrease_budget | refresh_creative | review
  suggested_value numeric,
  reason text,
  severity text NOT NULL DEFAULT 'medium', -- low | medium | high
  status text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | applied | failed
  metadata jsonb DEFAULT '{}'::jsonb,
  approved_by uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_optsugg_client_status ON public.optimization_suggestions(client_id, status);
ALTER TABLE public.optimization_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor manage suggestions"
  ON public.optimization_suggestions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Service role manages suggestions"
  ON public.optimization_suggestions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_optsugg_updated
  BEFORE UPDATE ON public.optimization_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rascunhos de campanha
CREATE TABLE IF NOT EXISTS public.campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  ad_account_id text NOT NULL,
  prompt text NOT NULL,
  structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft | publishing | published | failed
  meta_campaign_id text,
  publish_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drafts_client ON public.campaign_drafts(client_id, status);
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor manage drafts"
  ON public.campaign_drafts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Service role manages drafts"
  ON public.campaign_drafts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_drafts_updated
  BEFORE UPDATE ON public.campaign_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
