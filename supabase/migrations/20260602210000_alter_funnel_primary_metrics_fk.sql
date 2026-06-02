-- Drop foreign key constraints to make the dashboard tables fully resilient and independent of client table syncing
ALTER TABLE public.funnel_primary_metrics DROP CONSTRAINT IF EXISTS funnel_primary_metrics_client_id_fkey;
ALTER TABLE public.funnel_diagnostics DROP CONSTRAINT IF EXISTS funnel_diagnostics_client_id_fkey;

-- Recreate policy for authenticated users with WITH CHECK clause to ensure UPSERT succeeds
DROP POLICY IF EXISTS "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_primary_metrics;
CREATE POLICY "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_primary_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_diagnostics;
CREATE POLICY "Permitir leitura/escrita para usuarios autenticados" ON public.funnel_diagnostics FOR ALL TO authenticated USING (true) WITH CHECK (true);
