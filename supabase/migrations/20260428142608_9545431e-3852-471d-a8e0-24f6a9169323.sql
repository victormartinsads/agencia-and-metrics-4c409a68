-- ==========================================
-- 1. Tabela de mapeamento de colunas por planilha
-- ==========================================
CREATE TABLE IF NOT EXISTS public.spreadsheet_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id uuid NOT NULL REFERENCES public.client_spreadsheets(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  metric_key text NOT NULL,
  column_letter text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spreadsheet_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_sfm_client ON public.spreadsheet_field_mappings(client_id);
CREATE INDEX IF NOT EXISTS idx_sfm_spreadsheet ON public.spreadsheet_field_mappings(spreadsheet_id);

ALTER TABLE public.spreadsheet_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select spreadsheet_field_mappings"
  ON public.spreadsheet_field_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert spreadsheet_field_mappings"
  ON public.spreadsheet_field_mappings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update spreadsheet_field_mappings"
  ON public.spreadsheet_field_mappings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete spreadsheet_field_mappings"
  ON public.spreadsheet_field_mappings FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages spreadsheet_field_mappings"
  ON public.spreadsheet_field_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_sfm_updated_at
  BEFORE UPDATE ON public.spreadsheet_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 2. Tabela de log de sincronizações
-- ==========================================
CREATE TABLE IF NOT EXISTS public.sheets_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  spreadsheet_id uuid REFERENCES public.client_spreadsheets(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | success | error | partial
  rows_read integer NOT NULL DEFAULT 0,
  rows_saved integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'manual', -- manual | cron | api
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ssl_client ON public.sheets_sync_log(client_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssl_spreadsheet ON public.sheets_sync_log(spreadsheet_id, started_at DESC);

ALTER TABLE public.sheets_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select sheets_sync_log"
  ON public.sheets_sync_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view sheets_sync_log"
  ON public.sheets_sync_log FOR SELECT TO anon USING (true);
CREATE POLICY "Auth insert sheets_sync_log"
  ON public.sheets_sync_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role manages sheets_sync_log"
  ON public.sheets_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- 3. Adicionar referência de planilha na weekly_metrics
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_metrics'
      AND column_name = 'spreadsheet_id'
  ) THEN
    -- Already exists per schema, but just in case
    ALTER TABLE public.weekly_metrics ADD COLUMN spreadsheet_id uuid;
  END IF;
END $$;

-- Add FK constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'weekly_metrics'
      AND constraint_name = 'weekly_metrics_spreadsheet_id_fkey'
  ) THEN
    ALTER TABLE public.weekly_metrics
      ADD CONSTRAINT weekly_metrics_spreadsheet_id_fkey
      FOREIGN KEY (spreadsheet_id)
      REFERENCES public.client_spreadsheets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weekly_metrics_spreadsheet ON public.weekly_metrics(spreadsheet_id);