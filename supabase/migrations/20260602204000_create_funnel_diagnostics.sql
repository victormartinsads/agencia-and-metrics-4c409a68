-- Create funnel_diagnostics table
CREATE TABLE IF NOT EXISTS public.funnel_diagnostics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    funnel_code text NOT NULL,
    health_score numeric NOT NULL DEFAULT 7.5,
    curve_data jsonb NOT NULL DEFAULT '{"hook_rate": 94.5, "hold_rate": 17.5, "ctr_link": 2.74, "cost_per_play": 0.05}'::jsonb,
    diagnostics jsonb NOT NULL DEFAULT '{"criativos": {"score": 9.0, "text": "Excelente gancho inicial e roteiro premium.", "suggestion": ""}, "publico": {"score": 8.5, "text": "Segmentações alinhadas e público quente.", "suggestion": ""}, "conversao_lp": {"score": 6.2, "text": "Taxa ideal mas há lentidão na página.", "suggestion": "Otimizar LP"}, "checkouts": {"score": 5.5, "text": "Muitas desistências no início do checkout.", "suggestion": ""}, "custos": {"score": 5.1, "text": "CPA acima da média esperada.", "suggestion": "Otimizar custos"}, "oferta": {"score": 7.9, "text": "Ticket atrativo com bônus de conversão.", "suggestion": "Otimizar oferta"}}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT funnel_diagnostics_client_funnel_key UNIQUE (client_id, funnel_code)
);

-- Enable RLS
ALTER TABLE public.funnel_diagnostics ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_diagnostics FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir leitura anonima" ON public.funnel_diagnostics FOR SELECT TO anon USING (true);
