
-- 1) Global default template per funnel code
CREATE TABLE IF NOT EXISTS public.funnel_card_template_global (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_code text NOT NULL UNIQUE,
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.funnel_card_template_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funnel_card_template_global"
  ON public.funnel_card_template_global FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth manage funnel_card_template_global"
  ON public.funnel_card_template_global FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2) Per-client + per-funnel lead action mapping
CREATE TABLE IF NOT EXISTS public.funnel_lead_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  action_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, funnel_code)
);
ALTER TABLE public.funnel_lead_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funnel_lead_mapping"
  ON public.funnel_lead_mapping FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth manage funnel_lead_mapping"
  ON public.funnel_lead_mapping FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Client visible tabs for /share
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS visible_tabs jsonb NOT NULL DEFAULT '["overview","funnel","creatives","branding"]'::jsonb;

-- 4) Seed default templates
INSERT INTO public.funnel_card_template_global (funnel_code, metrics) VALUES
  ('F1',  '["spend","impressions","reach","clicks","ctr","follows","cpFollow"]'::jsonb),
  ('F2',  '["spend","purchases","purchaseValue","roas","cpa","holdRate"]'::jsonb),
  ('F3',  '["spend","linkClicks","ctr","impressions","reach","messages","cpMessage"]'::jsonb),
  ('F4',  '["spend","impressions","reach","linkClicks","ctr","landingPageViews","leads","cpl"]'::jsonb),
  ('F9',  '["spend","impressions","reach","linkClicks","ctr","landingPageViews","cpLpv","initiateCheckout","cpInitiateCheckout","purchases","cpa"]'::jsonb),
  ('F10', '["spend","impressions","reach","linkClicks","ctr","leads","cpl"]'::jsonb),
  ('F12', '["spend","impressions","reach","linkClicks","ctr","landingPageViews","leads","cpl"]'::jsonb),
  ('F13', '["spend","impressions","reach","linkClicks","ctr","landingPageViews","cpLpv","leads","cpl","initiateCheckout","cpInitiateCheckout","purchases","cpa"]'::jsonb)
ON CONFLICT (funnel_code) DO UPDATE SET metrics = EXCLUDED.metrics, updated_at = now();
