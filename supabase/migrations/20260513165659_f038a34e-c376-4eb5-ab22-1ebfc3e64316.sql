
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#22c55e',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read lead_tags" ON public.lead_tags FOR SELECT TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members insert lead_tags" ON public.lead_tags FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members update lead_tags" ON public.lead_tags FOR UPDATE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members delete lead_tags" ON public.lead_tags FOR DELETE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Service manages lead_tags" ON public.lead_tags FOR ALL TO service_role USING (true) WITH CHECK (true);
