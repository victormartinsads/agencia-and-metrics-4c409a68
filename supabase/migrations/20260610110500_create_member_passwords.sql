-- Create member_passwords table to store password history set by the master admin
CREATE TABLE IF NOT EXISTS public.member_passwords (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_passwords ENABLE ROW LEVEL SECURITY;

-- Allow only the service_role (backend edge functions) full access to this table
CREATE POLICY "service_role full access" ON public.member_passwords
  FOR ALL TO service_role USING (true) WITH CHECK (true);
