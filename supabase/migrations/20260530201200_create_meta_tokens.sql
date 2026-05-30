-- Create meta_tokens table
CREATE TABLE IF NOT EXISTS public.meta_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
    access_token text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT meta_tokens_client_id_key UNIQUE (client_id)
);

-- Enable RLS
ALTER TABLE public.meta_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Permitir leitura/escrita para usuarios autenticados" ON public.meta_tokens FOR ALL TO authenticated USING (true);
