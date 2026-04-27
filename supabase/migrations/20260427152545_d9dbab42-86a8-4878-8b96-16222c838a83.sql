-- Permite leitura pública das tabelas usadas pelo Diagnóstico Semanal
-- para que a página /como-estamos/:slug seja compartilhável publicamente
-- (somente leitura; escrita continua restrita a usuários autenticados).

CREATE POLICY "Public can view weekly_diagnostics"
ON public.weekly_diagnostics
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can view weekly_notes"
ON public.weekly_notes
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can view diagnostic_metrics_config"
ON public.diagnostic_metrics_config
FOR SELECT
TO anon, authenticated
USING (true);