-- Create table client_creative_guides
CREATE TABLE IF NOT EXISTS public.client_creative_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'writing', 'producing', 'done', 'approved')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_creative_guides ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Permitir leitura para todos autenticados" ON public.client_creative_guides;
CREATE POLICY "Permitir leitura para todos autenticados" ON public.client_creative_guides
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Permitir escrita para staff" ON public.client_creative_guides;
CREATE POLICY "Permitir escrita para staff" ON public.client_creative_guides
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_role(auth.uid(), 'admin')
    OR public.has_staff_role(auth.uid(), 'ceo')
    OR public.has_staff_role(auth.uid(), 'diretor')
    OR public.has_staff_role(auth.uid(), 'gestor')
  );

-- Trigger for update_updated_at_column
DROP TRIGGER IF EXISTS update_client_creative_guides_updated_at ON public.client_creative_guides;
CREATE TRIGGER update_client_creative_guides_updated_at
  BEFORE UPDATE ON public.client_creative_guides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some mock guides
INSERT INTO public.client_creative_guides (client_id, title, status, due_date, notes)
VALUES 
  ('5a34fa1a-6f84-48f7-abc1-81bd1c00e99a', 'Guia de Criativos Azzo - Coleção Inverno', 'producing', CURRENT_DATE + INTERVAL '7 days', 'Foco em Reels dinâmicos mostrando a nova linha de estofados.'),
  ('1381e7e5-c466-4bf7-a887-456a7c70dc88', 'Guia de Criativos Quartzo - Venda Direta', 'planning', CURRENT_DATE + INTERVAL '14 days', 'Estruturação de copys focadas em dor e transformação.'),
  ('c11122ee-20f9-4d90-a9b5-6a1ee9abb084', 'Guia de Posicionamento Quantum', 'done', CURRENT_DATE - INTERVAL '2 days', 'Aprovado internamente, pronto para gravação.')
ON CONFLICT DO NOTHING;
