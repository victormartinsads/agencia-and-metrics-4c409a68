ALTER TABLE public.dashboard_sheet_config
ADD COLUMN IF NOT EXISTS metric_sources jsonb NOT NULL DEFAULT '{}'::jsonb;