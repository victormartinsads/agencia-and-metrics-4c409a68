CREATE TABLE IF NOT EXISTS public.agency_processes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  column_name TEXT NOT NULL, -- 'PRE_VENDA', 'CLIENTE_ATIVO', 'CONTROLE'
  icon_type TEXT NOT NULL, -- 'logo', 'cyclone', 'stop', 'cross'
  content JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_processes ENABLE ROW LEVEL SECURITY;

-- Simple policy for full access by authenticated users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agency_processes' AND policyname='agency_processes: full access for authenticated users') THEN
    CREATE POLICY "agency_processes: full access for authenticated users"
      ON public.agency_processes FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
