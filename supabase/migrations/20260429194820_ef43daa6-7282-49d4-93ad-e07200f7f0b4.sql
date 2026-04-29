-- Tabela de eventos de vendas vindos de webhooks (Hotmart, Kiwify, Eduzz, etc)
CREATE TABLE public.sales_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'hotmart' | 'kiwify' | 'eduzz' | 'manual_csv'
  transaction_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  buyer_email TEXT,
  status TEXT NOT NULL DEFAULT 'approved', -- approved | refunded | chargeback | pending
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  occurred_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform, transaction_id)
);

CREATE INDEX idx_sales_events_client_date ON public.sales_events (client_id, occurred_at DESC);
CREATE INDEX idx_sales_events_status ON public.sales_events (client_id, status);

ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select sales_events" ON public.sales_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sales_events" ON public.sales_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sales_events" ON public.sales_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete sales_events" ON public.sales_events FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages sales_events" ON public.sales_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Public can view sales_events" ON public.sales_events FOR SELECT TO anon USING (true);

-- Configuração por cliente: token de webhook e filtros de produto
CREATE TABLE public.sales_webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  webhook_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  -- filtro por plataforma -> array de product_ids permitidos (vazio = todos)
  product_filters JSONB NOT NULL DEFAULT '{"hotmart":[],"kiwify":[],"eduzz":[]}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_webhook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select sales_webhook_config" ON public.sales_webhook_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert sales_webhook_config" ON public.sales_webhook_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update sales_webhook_config" ON public.sales_webhook_config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete sales_webhook_config" ON public.sales_webhook_config FOR DELETE TO authenticated USING (true);
CREATE POLICY "Service role manages sales_webhook_config" ON public.sales_webhook_config FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_sales_webhook_config_updated_at
BEFORE UPDATE ON public.sales_webhook_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();