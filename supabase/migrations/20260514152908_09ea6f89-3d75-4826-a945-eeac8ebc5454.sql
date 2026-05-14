
-- Extensões para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: org pertence a um cliente?
CREATE OR REPLACE FUNCTION public.is_client_org(_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND client_id IS NOT NULL)
$$;

-- Policies para admin/editor da plataforma operarem nas orgs de clientes

-- pipelines
DROP POLICY IF EXISTS "Platform admins manage pipelines" ON public.pipelines;
CREATE POLICY "Platform admins manage pipelines" ON public.pipelines
FOR ALL TO authenticated
USING (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')))
WITH CHECK (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- lead_tags
DROP POLICY IF EXISTS "Platform admins manage lead_tags" ON public.lead_tags;
CREATE POLICY "Platform admins manage lead_tags" ON public.lead_tags
FOR ALL TO authenticated
USING (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')))
WITH CHECK (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- lead_custom_field_defs
DROP POLICY IF EXISTS "Platform admins manage custom field defs" ON public.lead_custom_field_defs;
CREATE POLICY "Platform admins manage custom field defs" ON public.lead_custom_field_defs
FOR ALL TO authenticated
USING (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')))
WITH CHECK (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- outbound_webhooks
DROP POLICY IF EXISTS "Platform admins manage outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Platform admins manage outbound_webhooks" ON public.outbound_webhooks
FOR ALL TO authenticated
USING (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')))
WITH CHECK (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'editor')));

-- webhook_tokens (tabela de integrações de entrada)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='webhook_tokens') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Platform admins manage webhook_tokens" ON public.webhook_tokens';
    EXECUTE 'CREATE POLICY "Platform admins manage webhook_tokens" ON public.webhook_tokens
      FOR ALL TO authenticated
      USING (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''editor'')))
      WITH CHECK (public.is_client_org(organization_id) AND (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''editor'')))';
  END IF;
END $$;
