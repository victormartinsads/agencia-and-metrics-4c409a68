
-- Drop old permissive policies on clients
DROP POLICY IF EXISTS "Public delete" ON public.clients;
DROP POLICY IF EXISTS "Public insert" ON public.clients;
DROP POLICY IF EXISTS "Public select" ON public.clients;
DROP POLICY IF EXISTS "Public update" ON public.clients;

-- Clients: public select (needed for shared pages), auth for CUD
CREATE POLICY "Anyone can select clients"
ON public.clients FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients FOR DELETE TO authenticated USING (true);

-- Drop old permissive policies on google_tokens
DROP POLICY IF EXISTS "Public delete google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Public insert google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Public select google_tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Public update google_tokens" ON public.google_tokens;

-- google_tokens: auth only
CREATE POLICY "Auth select google_tokens"
ON public.google_tokens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth insert google_tokens"
ON public.google_tokens FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth update google_tokens"
ON public.google_tokens FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Auth delete google_tokens"
ON public.google_tokens FOR DELETE TO authenticated USING (true);
