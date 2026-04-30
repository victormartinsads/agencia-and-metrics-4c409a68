-- =========================================================
-- NEW MULTI-ORG CRM (parallel to existing crm_* tables)
-- =========================================================

-- 1) profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3) org role + members
CREATE TYPE public.org_role AS ENUM ('owner','admin','member');

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4) helpers (security definer)
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id=_user_id AND organization_id=_org_id)
$$;

CREATE OR REPLACE FUNCTION public.has_org_role_in(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id=_user_id AND organization_id=_org_id AND role=_role)
$$;

-- 5) leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  company text,
  message text,
  source text DEFAULT 'webhook',
  status text NOT NULL DEFAULT 'new',
  notes text,
  value numeric(12,2),
  lead_score integer NOT NULL DEFAULT 0,
  utm_term text, utm_content text, utm_medium text, utm_campaign text,
  fclid text, instagram text, product text,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_leads_org ON public.leads(organization_id);

-- 6) webhook_tokens
CREATE TABLE public.webhook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32),'hex'),
  name text NOT NULL DEFAULT 'Webhook Principal',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_tokens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_webhook_tokens_org ON public.webhook_tokens(organization_id);

-- 7) outbound webhooks + events
CREATE TABLE public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Webhook de eventos',
  url text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['qualified','closed'],
  active boolean NOT NULL DEFAULT true,
  secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16),'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_outbound_webhooks_org ON public.outbound_webhooks(organization_id);

CREATE TABLE public.outbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_id uuid REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status_code integer,
  success boolean NOT NULL DEFAULT false,
  payload jsonb,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outbound_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_outbound_events_org ON public.outbound_events(organization_id);

-- 8) invites
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid,
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- 9) triggers
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_outbound_webhooks_updated BEFORE UPDATE ON public.outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle_new_user (cria profile no signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Users view profiles in same org"
ON public.profiles FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.user_id
  )
);
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- organizations
CREATE POLICY "Members view own org" ON public.organizations
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), id));
CREATE POLICY "Authenticated create orgs" ON public.organizations
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners update own org" ON public.organizations
FOR UPDATE TO authenticated USING (has_org_role_in(auth.uid(), id, 'owner'));
CREATE POLICY "Owners delete own org" ON public.organizations
FOR DELETE TO authenticated USING (has_org_role_in(auth.uid(), id, 'owner'));

-- organization_members
CREATE POLICY "Members view org members" ON public.organization_members
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
-- Allow user to insert themselves (used right after creating an org)
CREATE POLICY "User can self-join when creating" ON public.organization_members
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins insert members" ON public.organization_members
FOR INSERT TO authenticated WITH CHECK (
  is_member_of_org(auth.uid(), organization_id)
  AND (has_org_role_in(auth.uid(), organization_id, 'owner') OR has_org_role_in(auth.uid(), organization_id, 'admin'))
);
CREATE POLICY "Owners update members" ON public.organization_members
FOR UPDATE TO authenticated USING (has_org_role_in(auth.uid(), organization_id, 'owner'));
CREATE POLICY "Owners delete members" ON public.organization_members
FOR DELETE TO authenticated USING (has_org_role_in(auth.uid(), organization_id, 'owner'));

-- leads
CREATE POLICY "Members read leads" ON public.leads
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members insert leads" ON public.leads
FOR INSERT TO authenticated WITH CHECK (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members update leads" ON public.leads
FOR UPDATE TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members delete leads" ON public.leads
FOR DELETE TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Service inserts leads" ON public.leads
FOR INSERT TO service_role WITH CHECK (true);

-- webhook_tokens
CREATE POLICY "Members read webhook_tokens" ON public.webhook_tokens
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Admins insert webhook_tokens" ON public.webhook_tokens
FOR INSERT TO authenticated WITH CHECK (
  is_member_of_org(auth.uid(), organization_id)
  AND (has_org_role_in(auth.uid(), organization_id, 'owner') OR has_org_role_in(auth.uid(), organization_id, 'admin'))
);
CREATE POLICY "Admins update webhook_tokens" ON public.webhook_tokens
FOR UPDATE TO authenticated USING (
  is_member_of_org(auth.uid(), organization_id)
  AND (has_org_role_in(auth.uid(), organization_id, 'owner') OR has_org_role_in(auth.uid(), organization_id, 'admin'))
);
CREATE POLICY "Admins delete webhook_tokens" ON public.webhook_tokens
FOR DELETE TO authenticated USING (
  is_member_of_org(auth.uid(), organization_id)
  AND (has_org_role_in(auth.uid(), organization_id, 'owner') OR has_org_role_in(auth.uid(), organization_id, 'admin'))
);
-- service role needs to read tokens to validate inbound webhooks
CREATE POLICY "Service manages webhook_tokens" ON public.webhook_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- outbound_webhooks
CREATE POLICY "Members read outbound_webhooks" ON public.outbound_webhooks
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members write outbound_webhooks" ON public.outbound_webhooks
FOR INSERT TO authenticated WITH CHECK (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members update outbound_webhooks" ON public.outbound_webhooks
FOR UPDATE TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Members delete outbound_webhooks" ON public.outbound_webhooks
FOR DELETE TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Service manages outbound_webhooks" ON public.outbound_webhooks
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- outbound_events
CREATE POLICY "Members read outbound_events" ON public.outbound_events
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Service inserts outbound_events" ON public.outbound_events
FOR INSERT TO service_role WITH CHECK (true);

-- invites
CREATE POLICY "Members view invites" ON public.invites
FOR SELECT TO authenticated USING (is_member_of_org(auth.uid(), organization_id));
CREATE POLICY "Admins insert invites" ON public.invites
FOR INSERT TO authenticated WITH CHECK (
  is_member_of_org(auth.uid(), organization_id)
  AND (has_org_role_in(auth.uid(), organization_id, 'owner') OR has_org_role_in(auth.uid(), organization_id, 'admin'))
);
CREATE POLICY "Admins update invites" ON public.invites
FOR UPDATE TO authenticated USING (is_member_of_org(auth.uid(), organization_id));