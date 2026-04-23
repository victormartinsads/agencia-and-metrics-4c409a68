-- Tabela de configuração da planilha por cliente
CREATE TABLE public.client_sheets_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  spreadsheet_url TEXT,
  sheet_name TEXT NOT NULL DEFAULT 'Página1',
  range_notation TEXT NOT NULL DEFAULT 'A1:Z1000',
  -- Mapeamento de colunas (letra da coluna, ex: 'A', 'B', 'C')
  column_date TEXT,
  column_revenue TEXT,
  column_sales TEXT,
  column_mql TEXT,
  column_smql TEXT,
  column_avg_ticket TEXT,
  column_ltv TEXT,
  -- Configurações de parsing
  header_row INTEGER NOT NULL DEFAULT 1,
  decimal_separator TEXT NOT NULL DEFAULT ',',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.client_sheets_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select client_sheets_config"
  ON public.client_sheets_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert client_sheets_config"
  ON public.client_sheets_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update client_sheets_config"
  ON public.client_sheets_config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete client_sheets_config"
  ON public.client_sheets_config FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_client_sheets_config_updated_at
  BEFORE UPDATE ON public.client_sheets_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de métricas semanais sincronizadas
CREATE TABLE public.weekly_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  revenue NUMERIC DEFAULT 0,
  sales INTEGER DEFAULT 0,
  mql INTEGER DEFAULT 0,
  smql INTEGER DEFAULT 0,
  avg_ticket NUMERIC DEFAULT 0,
  ltv NUMERIC DEFAULT 0,
  raw_row JSONB,
  source TEXT NOT NULL DEFAULT 'google_sheets',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, reference_date)
);

CREATE INDEX idx_weekly_metrics_client_date ON public.weekly_metrics(client_id, reference_date DESC);

ALTER TABLE public.weekly_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select weekly_metrics"
  ON public.weekly_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert weekly_metrics"
  ON public.weekly_metrics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update weekly_metrics"
  ON public.weekly_metrics FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete weekly_metrics"
  ON public.weekly_metrics FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages weekly_metrics"
  ON public.weekly_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_weekly_metrics_updated_at
  BEFORE UPDATE ON public.weekly_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();