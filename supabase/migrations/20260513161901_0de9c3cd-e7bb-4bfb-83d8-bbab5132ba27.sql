-- Add custom_fields jsonb to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create custom field definitions per organization
CREATE TABLE IF NOT EXISTS public.lead_custom_field_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

ALTER TABLE public.lead_custom_field_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read custom field defs"
  ON public.lead_custom_field_defs FOR SELECT TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members insert custom field defs"
  ON public.lead_custom_field_defs FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members update custom field defs"
  ON public.lead_custom_field_defs FOR UPDATE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members delete custom field defs"
  ON public.lead_custom_field_defs FOR DELETE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Service manages custom field defs"
  ON public.lead_custom_field_defs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_lead_custom_field_defs_updated_at
  BEFORE UPDATE ON public.lead_custom_field_defs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();