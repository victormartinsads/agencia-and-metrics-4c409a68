-- 1) Block source per dashboard block
CREATE TABLE IF NOT EXISTS public.dashboard_block_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  dashboard_key text NOT NULL,
  block_id text NOT NULL,
  source_type text NOT NULL DEFAULT 'auto',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, dashboard_key, block_id)
);

ALTER TABLE public.dashboard_block_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage dashboard_block_sources"
  ON public.dashboard_block_sources FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read dashboard_block_sources"
  ON public.dashboard_block_sources FOR SELECT TO anon, authenticated
  USING (true);

CREATE TRIGGER trg_dashboard_block_sources_updated_at
  BEFORE UPDATE ON public.dashboard_block_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Layout per dashboard block (drag/resize positions)
CREATE TABLE IF NOT EXISTS public.dashboard_block_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  dashboard_key text NOT NULL,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, dashboard_key)
);

ALTER TABLE public.dashboard_block_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage dashboard_block_layouts"
  ON public.dashboard_block_layouts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read dashboard_block_layouts"
  ON public.dashboard_block_layouts FOR SELECT TO anon, authenticated
  USING (true);

CREATE TRIGGER trg_dashboard_block_layouts_updated_at
  BEFORE UPDATE ON public.dashboard_block_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Multi sheets per client
CREATE TABLE IF NOT EXISTS public.client_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  spreadsheet_id text NOT NULL,
  spreadsheet_url text,
  sheet_name text NOT NULL DEFAULT 'Página1',
  header_row integer NOT NULL DEFAULT 1,
  range_a1 text,
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  last_sync_rows integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage client_sheets"
  ON public.client_sheets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read client_sheets"
  ON public.client_sheets FOR SELECT TO anon, authenticated
  USING (true);

CREATE TRIGGER trg_client_sheets_updated_at
  BEFORE UPDATE ON public.client_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_client_sheets_client ON public.client_sheets(client_id);
CREATE INDEX IF NOT EXISTS idx_block_sources_client_dash ON public.dashboard_block_sources(client_id, dashboard_key);