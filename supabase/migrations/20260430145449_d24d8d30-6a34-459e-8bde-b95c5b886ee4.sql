
-- 1) Adicionar 'client' ao enum de roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- 2) Vínculo usuário <-> cliente
CREATE TABLE IF NOT EXISTS public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_client_users_client ON public.client_users(client_id);

-- Função helper: client_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_client_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT client_id FROM public.client_users WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Admins manage client_users" ON public.client_users
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own client_user" ON public.client_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

-- 3) Pipeline stages (editável por cliente)
CREATE TABLE IF NOT EXISTS public.crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_stages_client ON public.crm_pipeline_stages(client_id);

-- 4) Tags
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crm_tags_client ON public.crm_tags(client_id);

-- 5) Leads
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  sales_event_id UUID,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crm_leads_client ON public.crm_leads(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage_id);

-- 6) Histórico/timeline
CREATE TABLE IF NOT EXISTS public.crm_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'created', 'stage_changed', 'note', 'tag_added', 'won', 'lost'
  content TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_lead_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crm_lead_events_lead ON public.crm_lead_events(lead_id);

-- 7) Webhook config
CREATE TABLE IF NOT EXISTS public.crm_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  webhook_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  default_stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_webhook_config ENABLE ROW LEVEL SECURITY;

-- 8) RLS policies para todas as tabelas CRM
-- Helper inline: pode ler/escrever se admin/editor OU client_users.client_id = client_id
-- Pipeline stages
CREATE POLICY "CRM stages: admin/editor full" ON public.crm_pipeline_stages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "CRM stages: client own" ON public.crm_pipeline_stages
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));

-- Tags
CREATE POLICY "CRM tags: admin/editor full" ON public.crm_tags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "CRM tags: client own" ON public.crm_tags
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));

-- Leads
CREATE POLICY "CRM leads: admin/editor full" ON public.crm_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "CRM leads: client own" ON public.crm_leads
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "CRM leads: service role" ON public.crm_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Lead events
CREATE POLICY "CRM events: admin/editor full" ON public.crm_lead_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "CRM events: client own" ON public.crm_lead_events
  FOR ALL TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "CRM events: service role" ON public.crm_lead_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Webhook config
CREATE POLICY "CRM webhook: admin/editor full" ON public.crm_webhook_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "CRM webhook: client own read/update" ON public.crm_webhook_config
  FOR SELECT TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "CRM webhook: client update own" ON public.crm_webhook_config
  FOR UPDATE TO authenticated
  USING (client_id = public.get_user_client_id(auth.uid()))
  WITH CHECK (client_id = public.get_user_client_id(auth.uid()));
CREATE POLICY "CRM webhook: service role" ON public.crm_webhook_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9) Triggers de updated_at
CREATE TRIGGER trg_client_users_updated BEFORE UPDATE ON public.client_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_stages_updated BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_leads_updated BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crm_webhook_updated BEFORE UPDATE ON public.crm_webhook_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) Trigger: ao mover lead para stage 'is_won' com valor>0, criar sales_event; ao sair, remover.
CREATE OR REPLACE FUNCTION public.crm_sync_lead_to_sales()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_won BOOLEAN := false;
  v_was_won BOOLEAN := false;
  v_event_id UUID;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT is_won INTO v_is_won FROM public.crm_pipeline_stages WHERE id = NEW.stage_id;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stage_id IS NOT NULL THEN
    SELECT is_won INTO v_was_won FROM public.crm_pipeline_stages WHERE id = OLD.stage_id;
  END IF;

  -- Tornou-se ganho com valor > 0 e ainda não tem sales_event
  IF COALESCE(v_is_won,false) AND NEW.value > 0 AND NEW.sales_event_id IS NULL THEN
    INSERT INTO public.sales_events (
      client_id, platform, transaction_id, product_id, product_name,
      status, gross_amount, net_amount, currency, occurred_at, raw_payload
    ) VALUES (
      NEW.client_id, 'crm', 'crm_' || NEW.id::text, NULL, COALESCE(NEW.name, 'CRM Lead'),
      'approved', NEW.value, NEW.value, NEW.currency, COALESCE(NEW.closed_at, now()),
      jsonb_build_object('source','crm_lead','lead_id',NEW.id)
    ) RETURNING id INTO v_event_id;
    NEW.sales_event_id := v_event_id;
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    INSERT INTO public.crm_lead_events(client_id, lead_id, type, content)
      VALUES (NEW.client_id, NEW.id, 'won', 'Lead ganho — venda registrada');
  END IF;

  -- Saiu de ganho: remover sales_event
  IF TG_OP = 'UPDATE' AND COALESCE(v_was_won,false) AND NOT COALESCE(v_is_won,false) AND OLD.sales_event_id IS NOT NULL THEN
    DELETE FROM public.sales_events WHERE id = OLD.sales_event_id;
    NEW.sales_event_id := NULL;
    NEW.closed_at := NULL;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_crm_lead_sync_sales
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_sync_lead_to_sales();

-- 11) Trigger de timeline: insert/stage change
CREATE OR REPLACE FUNCTION public.crm_lead_timeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.crm_lead_events(client_id, lead_id, type, content, created_by)
    VALUES (NEW.client_id, NEW.id, 'created', 'Lead criado', auth.uid());
  ELSIF TG_OP = 'UPDATE' AND COALESCE(OLD.stage_id::text,'') <> COALESCE(NEW.stage_id::text,'') THEN
    INSERT INTO public.crm_lead_events(client_id, lead_id, type, content, created_by, metadata)
    VALUES (NEW.client_id, NEW.id, 'stage_changed', 'Etapa alterada', auth.uid(),
      jsonb_build_object('from', OLD.stage_id, 'to', NEW.stage_id));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_crm_lead_timeline
  AFTER INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_lead_timeline();

-- 12) Função para criar pipeline padrão e webhook config para um cliente
CREATE OR REPLACE FUNCTION public.crm_ensure_defaults(_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.crm_pipeline_stages WHERE client_id = _client_id) THEN
    INSERT INTO public.crm_pipeline_stages(client_id, name, color, sort_order, is_won, is_lost) VALUES
      (_client_id, 'Novo',       '#94a3b8', 0, false, false),
      (_client_id, 'Em Contato', '#3b82f6', 1, false, false),
      (_client_id, 'Proposta',   '#f59e0b', 2, false, false),
      (_client_id, 'Ganho',      '#22c55e', 3, true,  false),
      (_client_id, 'Perdido',    '#ef4444', 4, false, true);
  END IF;
  INSERT INTO public.crm_webhook_config(client_id) VALUES (_client_id)
    ON CONFLICT (client_id) DO NOTHING;
END $$;
