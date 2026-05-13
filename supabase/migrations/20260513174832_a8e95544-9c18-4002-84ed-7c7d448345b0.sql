ALTER TABLE public.webhook_tokens
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb;