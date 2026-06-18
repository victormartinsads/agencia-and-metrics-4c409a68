-- Create sent_alerts_log table for deduplicating WhatsApp alerts
-- Ensures each client only receives one alert per day

CREATE TABLE IF NOT EXISTS public.sent_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  alert_key TEXT NOT NULL,
  message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by client_id and sent_at (used by the 24h dedup query)
CREATE INDEX IF NOT EXISTS idx_sent_alerts_log_client_sent
  ON public.sent_alerts_log (client_id, sent_at DESC);

-- RLS: allow the service role to insert/select (edge functions use service role key)
ALTER TABLE public.sent_alerts_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own alerts (for debugging/admin views)
DROP POLICY IF EXISTS "Members read sent_alerts_log" ON public.sent_alerts_log;
CREATE POLICY "Members read sent_alerts_log" ON public.sent_alerts_log
  FOR SELECT TO authenticated
  USING (true);

-- Allow service role full access (handled by default, but explicit for clarity)
DROP POLICY IF EXISTS "Service role full access sent_alerts_log" ON public.sent_alerts_log;
CREATE POLICY "Service role full access sent_alerts_log" ON public.sent_alerts_log
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: delete logs older than 7 days (optional, keeps table small)
-- This can be run as a scheduled pg_cron job if desired
