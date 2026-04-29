
-- Drop old tables (cascade removes any dependent FKs)
DROP TABLE IF EXISTS public.spreadsheet_field_mappings CASCADE;
DROP TABLE IF EXISTS public.metric_data_sources CASCADE;
DROP TABLE IF EXISTS public.dashboard_metric_sources CASCADE;
DROP TABLE IF EXISTS public.client_spreadsheets CASCADE;
DROP TABLE IF EXISTS public.client_sheets_config CASCADE;

-- New simplified config: one spreadsheet per client + JSON mapping (block_key -> header name)
CREATE TABLE public.dashboard_sheet_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_name TEXT,
  spreadsheet_url TEXT,
  sheet_name TEXT NOT NULL DEFAULT 'Página1',
  header_row INTEGER NOT NULL DEFAULT 1,
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  decimal_separator TEXT NOT NULL DEFAULT ',',
  -- Mapping: { "date": "Data", "revenue": "Faturamento", "sales": "Vendas", "product_code": "Produto", ... }
  field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_revenue_goal NUMERIC DEFAULT 0,
  monthly_investment_budget NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  last_sync_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_sheet_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth insert dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth update dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth delete dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role manages dashboard_sheet_config"
  ON public.dashboard_sheet_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_dashboard_sheet_config_updated_at
  BEFORE UPDATE ON public.dashboard_sheet_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clean orphan column on weekly_metrics (was pointing to client_spreadsheets we just dropped)
ALTER TABLE public.weekly_metrics DROP COLUMN IF EXISTS spreadsheet_id;
