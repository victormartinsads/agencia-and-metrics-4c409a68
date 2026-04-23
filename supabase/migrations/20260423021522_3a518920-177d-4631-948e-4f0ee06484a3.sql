-- 1) Tabela: planilhas do cliente (múltiplas por cliente)
CREATE TABLE IF NOT EXISTS public.client_spreadsheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Planilha',
  spreadsheet_id text NOT NULL,
  spreadsheet_url text,
  sheet_name text NOT NULL DEFAULT 'Página1',
  range_notation text NOT NULL DEFAULT 'A1:Z1000',
  header_row integer NOT NULL DEFAULT 1,
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  decimal_separator text NOT NULL DEFAULT ',',
  is_primary boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_spreadsheets_client ON public.client_spreadsheets(client_id);

ALTER TABLE public.client_spreadsheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select client_spreadsheets"
  ON public.client_spreadsheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert client_spreadsheets"
  ON public.client_spreadsheets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update client_spreadsheets"
  ON public.client_spreadsheets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete client_spreadsheets"
  ON public.client_spreadsheets FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages client_spreadsheets"
  ON public.client_spreadsheets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_client_spreadsheets_updated
  BEFORE UPDATE ON public.client_spreadsheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tabela: mapeamento de cada métrica do dashboard a uma planilha + coluna
CREATE TABLE IF NOT EXISTS public.metric_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  source_type text NOT NULL DEFAULT 'sheet', -- 'sheet' | 'meta' | 'ga' | 'manual'
  spreadsheet_id uuid REFERENCES public.client_spreadsheets(id) ON DELETE SET NULL,
  column_letter text,
  manual_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_metric_data_sources_client ON public.metric_data_sources(client_id);

ALTER TABLE public.metric_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select metric_data_sources"
  ON public.metric_data_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert metric_data_sources"
  ON public.metric_data_sources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update metric_data_sources"
  ON public.metric_data_sources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete metric_data_sources"
  ON public.metric_data_sources FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages metric_data_sources"
  ON public.metric_data_sources FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_metric_data_sources_updated
  BEFORE UPDATE ON public.metric_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Adicionar spreadsheet_id em weekly_metrics para identificar a planilha de origem
ALTER TABLE public.weekly_metrics
  ADD COLUMN IF NOT EXISTS spreadsheet_id uuid REFERENCES public.client_spreadsheets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_metrics_spreadsheet ON public.weekly_metrics(spreadsheet_id);

-- 4) Migrar dados existentes: cada client_sheets_config vira uma client_spreadsheets primária
INSERT INTO public.client_spreadsheets (
  client_id, label, spreadsheet_id, spreadsheet_url, sheet_name, range_notation,
  header_row, date_format, decimal_separator, is_primary,
  last_synced_at, last_sync_status, last_sync_error
)
SELECT
  csc.client_id,
  'Planilha Principal',
  csc.spreadsheet_id,
  csc.spreadsheet_url,
  csc.sheet_name,
  csc.range_notation,
  csc.header_row,
  csc.date_format,
  csc.decimal_separator,
  true,
  csc.last_synced_at,
  csc.last_sync_status,
  csc.last_sync_error
FROM public.client_sheets_config csc
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_spreadsheets cs WHERE cs.client_id = csc.client_id AND cs.is_primary = true
);