
DROP POLICY "Anyone can view clients" ON public.clients;
DROP POLICY "Anyone can insert clients" ON public.clients;
DROP POLICY "Anyone can update clients" ON public.clients;
DROP POLICY "Anyone can delete clients" ON public.clients;

CREATE POLICY "Public select" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON public.clients FOR DELETE USING (true);
