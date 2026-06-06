// Script para aplicar as migrations via Supabase REST API
// Executar com: node apply-migrations.mjs

const SUPABASE_URL = "https://pspkpqwfkgpsjgerxogm.supabase.co";

// Precisa da service_role key — leia do .env.local ou informe aqui
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("\n❌ SERVICE_ROLE_KEY não encontrada.");
  console.error("Execute assim:");
  console.error("  $env:SUPABASE_SERVICE_ROLE_KEY='eyJ...' ; node apply-migrations.mjs\n");
  process.exit(1);
}

const sql = `
-- ============================================================
-- TrackingHub — Migration 1: tracking_config, tracking_leads, capi_events_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  pixel_id TEXT,
  capi_token TEXT,
  test_event_code TEXT,
  ga4_measurement_id TEXT,
  ga4_api_secret TEXT,
  webhook_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_config_client ON public.tracking_config(client_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_config' AND policyname='tracking_config: admin/editor full') THEN
    CREATE POLICY "tracking_config: admin/editor full"
      ON public.tracking_config FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
      WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_config' AND policyname='tracking_config: service role') THEN
    CREATE POLICY "tracking_config: service role"
      ON public.tracking_config FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tracking_config_updated') THEN
    CREATE TRIGGER trg_tracking_config_updated
      BEFORE UPDATE ON public.tracking_config
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- tracking_leads
CREATE TABLE IF NOT EXISTS public.tracking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT,
  email_hash TEXT,
  phone TEXT,
  phone_hash TEXT,
  fbclid TEXT,
  fbp TEXT,
  fbc TEXT,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  page_url TEXT,
  referrer TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracking_leads_client_email_unique UNIQUE (client_id, email)
);

ALTER TABLE public.tracking_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_leads_client ON public.tracking_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_tracking_leads_email ON public.tracking_leads(client_id, email);
CREATE INDEX IF NOT EXISTS idx_tracking_leads_fbclid ON public.tracking_leads(fbclid);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_leads' AND policyname='tracking_leads: admin/editor full') THEN
    CREATE POLICY "tracking_leads: admin/editor full"
      ON public.tracking_leads FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
      WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_leads' AND policyname='tracking_leads: service role') THEN
    CREATE POLICY "tracking_leads: service role"
      ON public.tracking_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- capi_events_log
CREATE TABLE IF NOT EXISTS public.capi_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sales_event_id UUID REFERENCES public.sales_events(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_id TEXT,
  platform TEXT NOT NULL,
  pixel_id TEXT,
  ga4_measurement_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  match_quality_score NUMERIC,
  payload_sent JSONB,
  meta_response JSONB,
  error_message TEXT,
  buyer_email_masked TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  had_fbclid BOOLEAN DEFAULT false,
  had_fbp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capi_events_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_capi_log_client ON public.capi_events_log(client_id);
CREATE INDEX IF NOT EXISTS idx_capi_log_created ON public.capi_events_log(created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='capi_events_log' AND policyname='capi_log: admin/editor full') THEN
    CREATE POLICY "capi_log: admin/editor full"
      ON public.capi_events_log FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
      WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='capi_events_log' AND policyname='capi_log: service role') THEN
    CREATE POLICY "capi_log: service role"
      ON public.capi_events_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Colunas novas em sales_events
ALTER TABLE public.sales_events
  ADD COLUMN IF NOT EXISTS is_order_bump BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS capi_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ga4_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS tracking_lead_id UUID REFERENCES public.tracking_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_events_tracking_lead ON public.sales_events(tracking_lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_capi ON public.sales_events(client_id, capi_dispatched);

-- Função helper
CREATE OR REPLACE FUNCTION public.tracking_ensure_config(_client_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.tracking_config(client_id)
  VALUES (_client_id)
  ON CONFLICT (client_id) DO NOTHING;
  SELECT id INTO v_id FROM public.tracking_config WHERE client_id = _client_id;
  RETURN v_id;
END $$;

-- ============================================================
-- Migration 2: tracking_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  display_name TEXT,
  is_standard BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'page_load',
  trigger_selector TEXT,
  trigger_value TEXT,
  custom_params JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_events_client ON public.tracking_events(client_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_events' AND policyname='tracking_events: admin/editor full') THEN
    CREATE POLICY "tracking_events: admin/editor full"
      ON public.tracking_events FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
      WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tracking_events' AND policyname='tracking_events: service role') THEN
    CREATE POLICY "tracking_events: service role"
      ON public.tracking_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_tracking_events_updated') THEN
    CREATE TRIGGER trg_tracking_events_updated
      BEFORE UPDATE ON public.tracking_events
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tracking_ensure_events(_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tracking_events WHERE client_id = _client_id) THEN
    INSERT INTO public.tracking_events
      (client_id, event_name, display_name, is_standard, enabled, trigger_type, sort_order)
    VALUES
      (_client_id, 'PageView',         'Visualização de Página',  true, true,  'page_load',       0),
      (_client_id, 'ViewContent',      'Visualização de Oferta',  true, false, 'page_load',       1),
      (_client_id, 'InitiateCheckout', 'Clique no Checkout',      true, true,  'checkout_click',  2),
      (_client_id, 'Lead',             'Envio de Formulário',     true, false, 'form_submit',     3),
      (_client_id, 'Purchase',         'Compra (via webhook)',    true, true,  'webhook_only',    4);
  END IF;
END $$;
`;

async function runSQL(sqlQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql: sqlQuery }),
  });

  if (!res.ok) {
    // Tentar via pg endpoint direto
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sqlQuery }),
    });
    const text2 = await res2.text();
    console.log("pg/query response:", res2.status, text2.slice(0, 300));
    return;
  }

  const text = await res.text();
  console.log("Response:", res.status, text.slice(0, 200));
}

console.log("🚀 Aplicando migrations do TrackingHub...\n");
runSQL(sql)
  .then(() => console.log("\n✅ Concluído! Recarregue o TrackingHub no browser."))
  .catch(e => {
    console.error("\n❌ Erro:", e.message);
    console.error("\nAplicação manual necessária:");
    console.error("→ Abra https://supabase.com/dashboard/project/pspkpqwfkgpsjgerxogm/sql");
    console.error("→ Cole o conteúdo de supabase/migrations/20260605120000_tracking_hub.sql");
    console.error("→ Execute. Depois repita com 20260605130000_tracking_events.sql");
  });
