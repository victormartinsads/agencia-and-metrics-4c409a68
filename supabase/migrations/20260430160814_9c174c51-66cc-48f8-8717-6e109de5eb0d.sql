-- 1. Adiciona client_id em organizations (nullable, unique)
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS client_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organizations_client_id ON public.organizations(client_id);

-- 2. Função: pega org_id de um client_id
CREATE OR REPLACE FUNCTION public.get_org_id_for_client(_client_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.organizations WHERE client_id = _client_id LIMIT 1
$$;

-- 3. Função: auto-vincula client_user como member da org do seu cliente
CREATE OR REPLACE FUNCTION public.sync_client_user_to_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE client_id = NEW.client_id;
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, NEW.user_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

-- 4. Trigger no client_users: ao criar vínculo, se já existe org pro cliente, adiciona como member
DROP TRIGGER IF EXISTS on_client_user_created ON public.client_users;
CREATE TRIGGER on_client_user_created
  AFTER INSERT ON public.client_users
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_user_to_org();

-- 5. Função: ao ativar CRM (criar org com client_id), backfill todos os client_users existentes desse cliente
CREATE OR REPLACE FUNCTION public.backfill_org_members_from_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    SELECT NEW.id, cu.user_id, 'member'
    FROM public.client_users cu
    WHERE cu.client_id = NEW.client_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_org_created_backfill ON public.organizations;
CREATE TRIGGER on_org_created_backfill
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.backfill_org_members_from_client();

-- 6. RLS adicional: admins/editors da plataforma podem ver/gerenciar todas as orgs vinculadas a clientes
CREATE POLICY "Platform admins view all client orgs"
ON public.organizations FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
);

-- 7. Permite admin/editor virar member automaticamente em qualquer org de cliente
CREATE POLICY "Platform admins manage all client org members"
ON public.organization_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.id = organization_id 
      AND o.client_id IS NOT NULL
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.id = organization_id 
      AND o.client_id IS NOT NULL
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
);

-- 8. Admin/editor pode ver leads de qualquer org de cliente
CREATE POLICY "Platform admins read all client leads"
ON public.leads FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.id = organization_id 
      AND o.client_id IS NOT NULL
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o 
    WHERE o.id = organization_id 
      AND o.client_id IS NOT NULL
      AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  )
);