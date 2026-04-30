-- Tabela de atribuição de clientes a usuários
CREATE TABLE public.client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  assigned_by uuid,
  is_favorite boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own assignments"
ON public.client_assignments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users manage own assignments"
ON public.client_assignments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own assignments"
ON public.client_assignments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all assignments"
ON public.client_assignments FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_client_assignments_user ON public.client_assignments(user_id);
CREATE INDEX idx_client_assignments_client ON public.client_assignments(client_id);

-- Tabela de templates da Visão Geral
CREATE TABLE public.overview_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  template_key text NOT NULL DEFAULT 'ecommerce',
  block_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.overview_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage overview_templates"
ON public.overview_templates FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Public read overview_templates"
ON public.overview_templates FOR SELECT TO anon
USING (true);

CREATE TRIGGER update_overview_templates_updated_at
BEFORE UPDATE ON public.overview_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();