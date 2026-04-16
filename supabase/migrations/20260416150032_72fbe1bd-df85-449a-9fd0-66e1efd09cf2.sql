
-- Funnel stages table
CREATE TABLE public.funnel_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT DEFAULT NULL,
  name TEXT NOT NULL,
  metric_key TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select funnel_stages" ON public.funnel_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert funnel_stages" ON public.funnel_stages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update funnel_stages" ON public.funnel_stages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete funnel_stages" ON public.funnel_stages FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_funnel_stages_updated_at
  BEFORE UPDATE ON public.funnel_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved insights table
CREATE TABLE public.saved_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_preset TEXT NOT NULL DEFAULT 'last_7d',
  content TEXT NOT NULL DEFAULT '',
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth select saved_insights" ON public.saved_insights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert saved_insights" ON public.saved_insights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update saved_insights" ON public.saved_insights FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete saved_insights" ON public.saved_insights FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_saved_insights_updated_at
  BEFORE UPDATE ON public.saved_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly revenue on clients
ALTER TABLE public.clients ADD COLUMN monthly_revenue NUMERIC DEFAULT 0;
