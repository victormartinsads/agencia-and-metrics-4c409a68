
-- ============================================================
-- SECURITY HARDENING (fase 1) — mantém /share, /podio e admin UI
-- ============================================================

-- 1) clients.meta_access_token: revoga leitura para anon (público)
--    Mantém leitura para authenticated (admin UI usa o campo).
REVOKE SELECT (meta_access_token) ON public.clients FROM anon;
REVOKE SELECT (meta_access_token) ON public.clients FROM PUBLIC;

-- 2) google_tokens: tokens OAuth NÃO devem ser legíveis pelo frontend.
--    Apenas service_role (edge functions) deve acessar.
DROP POLICY IF EXISTS "Auth select google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Auth insert google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Auth update google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Auth delete google_tokens" ON public.google_tokens;

CREATE POLICY "Admins manage google_tokens"
ON public.google_tokens
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Service role manages google_tokens"
ON public.google_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3) sales_events: remove leitura anônima (contém buyer_email/valores).
DROP POLICY IF EXISTS "Public can view sales_events" ON public.sales_events;

-- Garante uma policy autenticada (admin/editor) caso não exista.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='sales_events'
      AND policyname='Admins manage sales_events'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Admins manage sales_events"
      ON public.sales_events
      FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
    $p$;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='sales_events'
      AND policyname='Service role manages sales_events'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role manages sales_events"
      ON public.sales_events
      FOR ALL TO service_role
      USING (true) WITH CHECK (true)
    $p$;
  END IF;
END $$;

-- 4) sales_webhook_config: tokens de webhook restritos a admin/editor + service_role.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename='sales_webhook_config' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales_webhook_config', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins manage sales_webhook_config"
ON public.sales_webhook_config
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Service role manages sales_webhook_config"
ON public.sales_webhook_config
FOR ALL TO service_role
USING (true) WITH CHECK (true);
