-- Per-funnel data source for selected metrics (revenue, sales, etc)
CREATE TABLE IF NOT EXISTS public.funnel_metric_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  metric_key text NOT NULL, -- 'revenue' | 'sales' | (future)
  source_type text NOT NULL DEFAULT 'auto', -- 'auto' | 'meta' | 'sheet'
  meta_campaign_id text,        -- when source_type = 'meta'
  meta_action_type text,        -- e.g. 'purchase' or 'omni_purchase'
  sheet_product_code text,      -- when source_type = 'sheet'
  sheet_field text,             -- 'revenue' | 'sales' | 'low_ticket_meta' ...
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code, metric_key)
);

ALTER TABLE public.funnel_metric_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage funnel_metric_sources"
  ON public.funnel_metric_sources FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read funnel_metric_sources"
  ON public.funnel_metric_sources FOR SELECT TO anon, authenticated
  USING (true);

-- Date-bounded manual metric inputs (followers from como estamos auto-feeds this)
CREATE TABLE IF NOT EXISTS public.funnel_period_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  metric_key text NOT NULL, -- 'followers' | 'leads_manual' | etc
  metric_label text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  source text NOT NULL DEFAULT 'como_estamos',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code, metric_key, period_start, period_end)
);

ALTER TABLE public.funnel_period_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage funnel_period_metrics"
  ON public.funnel_period_metrics FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read funnel_period_metrics"
  ON public.funnel_period_metrics FOR SELECT TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_funnel_period_metrics_lookup
  ON public.funnel_period_metrics (client_id, funnel_code, period_start, period_end);
