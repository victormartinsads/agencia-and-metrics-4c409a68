-- 1) Create pipeline_stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members read pipeline_stages" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_stages.pipeline_id AND is_member_of_org(auth.uid(), p.organization_id)
  ));

DROP POLICY IF EXISTS "Members insert pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members insert pipeline_stages" ON public.pipeline_stages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_stages.pipeline_id AND is_member_of_org(auth.uid(), p.organization_id)
  ));

DROP POLICY IF EXISTS "Members update pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members update pipeline_stages" ON public.pipeline_stages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_stages.pipeline_id AND is_member_of_org(auth.uid(), p.organization_id)
  ));

DROP POLICY IF EXISTS "Members delete pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Members delete pipeline_stages" ON public.pipeline_stages
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pipelines p 
    WHERE p.id = pipeline_stages.pipeline_id AND is_member_of_org(auth.uid(), p.organization_id)
  ));

DROP POLICY IF EXISTS "Service manages pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Service manages pipeline_stages" ON public.pipeline_stages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) Add stage_id to public.leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;

-- 3) Trigger function to automatically create default stages on new pipeline creation
CREATE OR REPLACE FUNCTION public.ensure_pipeline_default_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
  VALUES 
    (NEW.id, 'Novo', '#94a3b8', 0, false, false),
    (NEW.id, 'Em Contato', '#3b82f6', 1, false, false),
    (NEW.id, 'Qualificado', '#f59e0b', 2, false, false),
    (NEW.id, 'Proposta', '#8b5cf6', 3, false, false),
    (NEW.id, 'Fechado', '#22c55e', 4, true, false),
    (NEW.id, 'Perdido', '#ef4444', 5, false, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ensure_pipeline_default_stages ON public.pipelines;
CREATE TRIGGER trg_ensure_pipeline_default_stages
  AFTER INSERT ON public.pipelines
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_pipeline_default_stages();

-- 4) Populate default stages for all existing pipelines and map leads
DO $$
DECLARE
  p_rec RECORD;
  stage_id_new UUID;
  stage_id_contacted UUID;
  stage_id_qualified UUID;
  stage_id_proposal UUID;
  stage_id_closed UUID;
  stage_id_lost UUID;
BEGIN
  FOR p_rec IN SELECT id FROM public.pipelines LOOP
    -- Check if it already has stages
    IF NOT EXISTS (SELECT 1 FROM public.pipeline_stages WHERE pipeline_id = p_rec.id) THEN
      -- Insert default stages
      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Novo', '#94a3b8', 0, false, false) RETURNING id INTO stage_id_new;

      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Em Contato', '#3b82f6', 1, false, false) RETURNING id INTO stage_id_contacted;

      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Qualificado', '#f59e0b', 2, false, false) RETURNING id INTO stage_id_qualified;

      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Proposta', '#8b5cf6', 3, false, false) RETURNING id INTO stage_id_proposal;

      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Fechado', '#22c55e', 4, true, false) RETURNING id INTO stage_id_closed;

      INSERT INTO public.pipeline_stages (pipeline_id, name, color, sort_order, is_won, is_lost)
      VALUES (p_rec.id, 'Perdido', '#ef4444', 5, false, true) RETURNING id INTO stage_id_lost;

      -- Update existing leads for this pipeline to use the new stage_ids based on status
      UPDATE public.leads SET stage_id = stage_id_new WHERE pipeline_id = p_rec.id AND (status = 'new' OR status IS NULL);
      UPDATE public.leads SET stage_id = stage_id_contacted WHERE pipeline_id = p_rec.id AND status = 'contacted';
      UPDATE public.leads SET stage_id = stage_id_qualified WHERE pipeline_id = p_rec.id AND status = 'qualified';
      UPDATE public.leads SET stage_id = stage_id_proposal WHERE pipeline_id = p_rec.id AND status = 'proposal';
      UPDATE public.leads SET stage_id = stage_id_closed WHERE pipeline_id = p_rec.id AND status = 'closed';
      UPDATE public.leads SET stage_id = stage_id_lost WHERE pipeline_id = p_rec.id AND status = 'lost';
    END IF;
  END LOOP;
END $$;
