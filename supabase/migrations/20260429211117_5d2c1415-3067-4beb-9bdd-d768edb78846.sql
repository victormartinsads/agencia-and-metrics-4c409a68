
CREATE TABLE IF NOT EXISTS public.overview_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.overview_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage overview_layouts" ON public.overview_layouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read overview_layouts" ON public.overview_layouts FOR SELECT TO anon USING (true);

CREATE TABLE IF NOT EXISTS public.funnel_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  funnel_code TEXT NOT NULL,
  custom_label TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, funnel_code)
);
ALTER TABLE public.funnel_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage funnel_configs" ON public.funnel_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read funnel_configs" ON public.funnel_configs FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_sales_events_client_occurred ON public.sales_events(client_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_events_txn ON public.sales_events(client_id, platform, transaction_id);
