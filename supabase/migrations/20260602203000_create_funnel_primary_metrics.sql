-- Create funnel_primary_metrics table
CREATE TABLE IF NOT EXISTS public.funnel_primary_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    funnel_code text NOT NULL,
    primary_metric text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT funnel_primary_metrics_client_funnel_key UNIQUE (client_id, funnel_code)
);

-- Enable RLS
ALTER TABLE public.funnel_primary_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_primary_metrics FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir leitura anonima" ON public.funnel_primary_metrics FOR SELECT TO anon USING (true);
