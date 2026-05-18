CREATE TABLE IF NOT EXISTS public.funnel_manual_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, code)
);

ALTER TABLE public.funnel_manual_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/editor manage funnel_manual_groups"
ON public.funnel_manual_groups
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Public read funnel_manual_groups"
ON public.funnel_manual_groups
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TRIGGER update_funnel_manual_groups_updated_at
BEFORE UPDATE ON public.funnel_manual_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();