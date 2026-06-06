-- APPLY_THIS_IN_SUPABASE_V3.sql

CREATE TABLE IF NOT EXISTS public.inbound_webhooks_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.tracking_clients(id),
  platform TEXT,
  raw_payload JSONB,
  status TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar o realtime para logs para que as abas ao vivo funcionem
ALTER PUBLICATION supabase_realtime ADD TABLE capi_events_log;
ALTER PUBLICATION supabase_realtime ADD TABLE inbound_webhooks_log;
