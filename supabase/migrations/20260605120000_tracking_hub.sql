-- ============================================================
-- TrackingHub — Migration Completa
-- Server-Side Tracking: Meta CAPI + GA4 Measurement Protocol
-- ============================================================

-- 1) Configuração de rastreamento por cliente
CREATE TABLE IF NOT EXISTS public.tracking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Meta CAPI
  pixel_id TEXT,
  capi_token TEXT,             -- Meta System User Access Token
  test_event_code TEXT,        -- Para validação no Events Manager

  -- GA4 Measurement Protocol
  ga4_measurement_id TEXT,     -- G-XXXXXXXX
  ga4_api_secret TEXT,         -- API Secret do GA4

  -- Segurança
  webhook_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),

  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_config_client ON public.tracking_config(client_id);

-- RLS: agência tem acesso total, service_role também
CREATE POLICY "tracking_config: admin/editor full"
  ON public.tracking_config FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "tracking_config: service role"
  ON public.tracking_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER trg_tracking_config_updated
  BEFORE UPDATE ON public.tracking_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Leads de rastreamento — dados capturados na LP por visitante/email
CREATE TABLE IF NOT EXISTS public.tracking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Identificação
  email TEXT,
  email_hash TEXT,             -- SHA-256 normalizado (lower, trim)
  phone TEXT,
  phone_hash TEXT,             -- SHA-256 normalizado (E.164, sem +)

  -- Meta
  fbclid TEXT,
  fbp TEXT,                    -- cookie _fbp
  fbc TEXT,                    -- cookie _fbc ou construído do fbclid

  -- Contexto de rede
  ip_address TEXT,
  user_agent TEXT,

  -- UTMs capturados
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Página
  page_url TEXT,
  referrer TEXT,

  -- Timestamps
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Índice composto para busca rápida por email dentro do cliente
  CONSTRAINT tracking_leads_client_email_unique UNIQUE (client_id, email)
);

ALTER TABLE public.tracking_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_leads_client ON public.tracking_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_tracking_leads_email ON public.tracking_leads(client_id, email);
CREATE INDEX IF NOT EXISTS idx_tracking_leads_fbclid ON public.tracking_leads(fbclid);

-- RLS
CREATE POLICY "tracking_leads: admin/editor full"
  ON public.tracking_leads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "tracking_leads: service role"
  ON public.tracking_leads FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 3) Log de disparos CAPI e GA4
CREATE TABLE IF NOT EXISTS public.capi_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sales_event_id UUID REFERENCES public.sales_events(id) ON DELETE SET NULL,

  -- Identificação do evento
  event_name TEXT NOT NULL,    -- 'Purchase', 'PageView', 'ViewContent', 'InitiateCheckout'
  event_id TEXT,               -- UUID para deduplicação (compartilhado com Pixel)
  platform TEXT NOT NULL,      -- 'meta_capi' | 'ga4'

  -- Configuração usada
  pixel_id TEXT,
  ga4_measurement_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',  -- 'sent' | 'error' | 'skipped' | 'deduplicated'
  match_quality_score NUMERIC,             -- EMQ retornado pelo Meta (0-10)

  -- Payload e resposta
  payload_sent JSONB,
  meta_response JSONB,
  error_message TEXT,

  -- Dados do lead (para auditoria)
  buyer_email_masked TEXT,     -- email mascarado para exibição (j***@gmail.com)
  utm_source TEXT,
  utm_campaign TEXT,
  had_fbclid BOOLEAN DEFAULT false,
  had_fbp BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capi_events_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_capi_log_client ON public.capi_events_log(client_id);
CREATE INDEX IF NOT EXISTS idx_capi_log_sales_event ON public.capi_events_log(sales_event_id);
CREATE INDEX IF NOT EXISTS idx_capi_log_created ON public.capi_events_log(created_at DESC);

-- RLS
CREATE POLICY "capi_log: admin/editor full"
  ON public.capi_events_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "capi_log: service role"
  ON public.capi_events_log FOR ALL TO service_role USING (true) WITH CHECK (true);


-- 4) Expandir sales_events com campos de tracking
ALTER TABLE public.sales_events
  ADD COLUMN IF NOT EXISTS is_order_bump BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS capi_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ga4_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS tracking_lead_id UUID REFERENCES public.tracking_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_events_tracking_lead ON public.sales_events(tracking_lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_events_capi ON public.sales_events(client_id, capi_dispatched);


-- 5) Função helper: garante que tracking_config exista para um cliente
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
