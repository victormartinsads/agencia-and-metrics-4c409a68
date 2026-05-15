-- Add archived_at and logo_url to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS logo_url text NULL;

CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON public.clients(archived_at);

-- Storage bucket for client logos (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client-logos public read' AND tablename = 'objects') THEN
    CREATE POLICY "client-logos public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'client-logos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client-logos auth insert' AND tablename = 'objects') THEN
    CREATE POLICY "client-logos auth insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'client-logos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client-logos auth update' AND tablename = 'objects') THEN
    CREATE POLICY "client-logos auth update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'client-logos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'client-logos auth delete' AND tablename = 'objects') THEN
    CREATE POLICY "client-logos auth delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'client-logos');
  END IF;
END $$;