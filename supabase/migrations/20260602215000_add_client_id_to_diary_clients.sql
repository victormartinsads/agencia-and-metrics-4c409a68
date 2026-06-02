-- Add client_id UUID column referencing public.clients table to public.gestor_diary_clients
ALTER TABLE public.gestor_diary_clients ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;
