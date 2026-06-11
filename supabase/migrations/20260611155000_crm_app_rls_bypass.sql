-- Relax RLS policies for CRM tables to allow all authenticated users (members) to share the same information and manage them.

-- 1) organizations
DROP POLICY IF EXISTS "Members view own org" ON public.organizations;
CREATE POLICY "Members view own org" ON public.organizations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated create orgs" ON public.organizations;
CREATE POLICY "Authenticated create orgs" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners update own org" ON public.organizations;
CREATE POLICY "Owners update own org" ON public.organizations
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners delete own org" ON public.organizations;
CREATE POLICY "Owners delete own org" ON public.organizations
  FOR DELETE TO authenticated USING (true);

-- 2) organization_members
DROP POLICY IF EXISTS "Members view org members" ON public.organization_members;
CREATE POLICY "Members view org members" ON public.organization_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "User can self-join when creating" ON public.organization_members;
CREATE POLICY "User can self-join when creating" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins insert members" ON public.organization_members;
CREATE POLICY "Admins insert members" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Owners update members" ON public.organization_members;
CREATE POLICY "Owners update members" ON public.organization_members
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Owners delete members" ON public.organization_members;
CREATE POLICY "Owners delete members" ON public.organization_members
  FOR DELETE TO authenticated USING (true);

-- 3) pipelines
DROP POLICY IF EXISTS "Members read pipelines" ON public.pipelines;
CREATE POLICY "Members read pipelines" ON public.pipelines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Members insert pipelines" ON public.pipelines;
CREATE POLICY "Members insert pipelines" ON public.pipelines
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Members update pipelines" ON public.pipelines;
CREATE POLICY "Members update pipelines" ON public.pipelines
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Members delete pipelines" ON public.pipelines;
CREATE POLICY "Members delete pipelines" ON public.pipelines
  FOR DELETE TO authenticated USING (true);

-- 4) pipeline_stages
DROP POLICY IF EXISTS "Members read pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members read pipeline_stages" ON public.pipeline_stages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Members insert pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members insert pipeline_stages" ON public.pipeline_stages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Members update pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members update pipeline_stages" ON public.pipeline_stages
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Members delete pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members delete pipeline_stages" ON public.pipeline_stages
  FOR DELETE TO authenticated USING (true);

-- 5) leads
DROP POLICY IF EXISTS "Members read leads" ON public.leads;
CREATE POLICY "Members read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Members insert leads" ON public.leads;
CREATE POLICY "Members insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Members update leads" ON public.leads;
CREATE POLICY "Members update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Members delete leads" ON public.leads;
CREATE POLICY "Members delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

-- 6) webhook_tokens
DROP POLICY IF EXISTS "Members read webhook_tokens" ON public.webhook_tokens;
CREATE POLICY "Members read webhook_tokens" ON public.webhook_tokens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert webhook_tokens" ON public.webhook_tokens;
CREATE POLICY "Admins insert webhook_tokens" ON public.webhook_tokens
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins update webhook_tokens" ON public.webhook_tokens;
CREATE POLICY "Admins update webhook_tokens" ON public.webhook_tokens
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins delete webhook_tokens" ON public.webhook_tokens;
CREATE POLICY "Admins delete webhook_tokens" ON public.webhook_tokens
  FOR DELETE TO authenticated USING (true);

-- 7) outbound_webhooks
DROP POLICY IF EXISTS "Members read outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Members read outbound_webhooks" ON public.outbound_webhooks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Members write outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Members write outbound_webhooks" ON public.outbound_webhooks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Members update outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Members update outbound_webhooks" ON public.outbound_webhooks
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Members delete outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Members delete outbound_webhooks" ON public.outbound_webhooks
  FOR DELETE TO authenticated USING (true);

-- 8) outbound_events
DROP POLICY IF EXISTS "Members read outbound_events" ON public.outbound_events;
CREATE POLICY "Members read outbound_events" ON public.outbound_events
  FOR SELECT TO authenticated USING (true);
