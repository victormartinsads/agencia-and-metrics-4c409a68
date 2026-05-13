-- Pipelines table: each represents a separate inbound integration / kanban view
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#22c55e',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipelines_org ON public.pipelines(organization_id);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read pipelines" ON public.pipelines FOR SELECT TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members insert pipelines" ON public.pipelines FOR INSERT TO authenticated
  WITH CHECK (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members update pipelines" ON public.pipelines FOR UPDATE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members delete pipelines" ON public.pipelines FOR DELETE TO authenticated
  USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Service manages pipelines" ON public.pipelines FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_pipelines_updated BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add pipeline_id to leads, webhook_tokens, lead_custom_field_defs, outbound_webhooks
ALTER TABLE public.leads ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE SET NULL;
CREATE INDEX idx_leads_pipeline ON public.leads(pipeline_id);

ALTER TABLE public.webhook_tokens ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE;
CREATE INDEX idx_webhook_tokens_pipeline ON public.webhook_tokens(pipeline_id);

-- pipeline_id NULL on custom field defs = global to org; otherwise pipeline-specific
ALTER TABLE public.lead_custom_field_defs ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE;
CREATE INDEX idx_lead_cfd_pipeline ON public.lead_custom_field_defs(pipeline_id);

ALTER TABLE public.outbound_webhooks ADD COLUMN pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE;
CREATE INDEX idx_outbound_webhooks_pipeline ON public.outbound_webhooks(pipeline_id);
