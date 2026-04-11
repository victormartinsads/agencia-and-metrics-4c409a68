
CREATE TABLE public.meta_ads_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_preset TEXT NOT NULL DEFAULT 'last_7d',
  response_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE (client_id, date_preset)
);

ALTER TABLE public.meta_ads_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for cache"
  ON public.meta_ads_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage cache"
  ON public.meta_ads_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_meta_ads_cache_lookup ON public.meta_ads_cache (client_id, date_preset);
CREATE INDEX idx_meta_ads_cache_expires ON public.meta_ads_cache (expires_at);
