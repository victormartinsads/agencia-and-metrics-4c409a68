ALTER TABLE public.saved_diagnostics ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_saved_diagnostics_slug ON public.saved_diagnostics(slug);