CREATE TABLE IF NOT EXISTS public.funnel_custom_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  funnel_code TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code)
);

ALTER TABLE public.funnel_custom_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read funnel labels"
ON public.funnel_custom_labels FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Authenticated can write funnel labels"
ON public.funnel_custom_labels FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_funnel_custom_labels_updated_at
BEFORE UPDATE ON public.funnel_custom_labels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();