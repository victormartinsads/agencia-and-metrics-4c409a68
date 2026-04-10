
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  meta_access_token TEXT NOT NULL,
  ad_account_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT max_5_ad_accounts CHECK (array_length(ad_account_ids, 1) IS NULL OR array_length(ad_account_ids, 1) <= 5)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
