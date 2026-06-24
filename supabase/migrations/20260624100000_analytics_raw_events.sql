-- ============================================================
-- Tracking CDP: Raw Events & Enhanced Profiles
-- ============================================================

-- Adiciona and_id (UUID gerado no tracker) para consolidar a sessão do cliente
ALTER TABLE public.tracking_leads 
  ADD COLUMN IF NOT EXISTS and_id UUID,
  ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_tracking_leads_and_id ON public.tracking_leads(client_id, and_id);

-- Tabela de Raw Events (O motor do Custom Analytics)
-- Esta tabela vai receber TODOS os eventos (PageView, Heartbeat, Cliques) do tracker.
-- Em produção pesada, essa tabela pode ser migrada para ClickHouse.
CREATE TABLE IF NOT EXISTS public.tracking_raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Identidade
  and_id UUID NOT NULL,          -- ID persistente do navegador
  session_id UUID NOT NULL,      -- ID da sessão atual
  lead_id UUID REFERENCES public.tracking_leads(id) ON DELETE SET NULL, -- Se resolvido
  
  -- Evento
  event_name TEXT NOT NULL,      -- 'PageView', 'Heartbeat', 'Identify', 'Purchase'
  event_data JSONB DEFAULT '{}'::jsonb,
  
  -- Contexto Web
  url TEXT,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  
  -- Para conversões
  value NUMERIC,
  currency TEXT DEFAULT 'BRL',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_raw_events ENABLE ROW LEVEL SECURITY;

-- Índices essenciais para Analytics
CREATE INDEX IF NOT EXISTS idx_raw_events_client ON public.tracking_raw_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_events_and_id ON public.tracking_raw_events(client_id, and_id);
CREATE INDEX IF NOT EXISTS idx_raw_events_name ON public.tracking_raw_events(client_id, event_name, created_at DESC);

-- Políticas RLS
DROP POLICY IF EXISTS "raw_events: admin/editor full" ON public.tracking_raw_events;
CREATE POLICY "raw_events: admin/editor full"
  ON public.tracking_raw_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "raw_events: service role" ON public.tracking_raw_events;
CREATE POLICY "raw_events: service role"
  ON public.tracking_raw_events FOR ALL TO service_role USING (true) WITH CHECK (true);
