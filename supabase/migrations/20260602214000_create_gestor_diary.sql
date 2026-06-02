-- Create staff_roles table if not exists
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('admin', 'ceo', 'gerente', 'gestor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on staff_roles
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to check staff custom role
CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id UUID, _role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for staff_roles
CREATE POLICY "Leitura de roles por autenticados" ON public.staff_roles
FOR SELECT TO authenticated USING (true);

-- Apenas Admin (seja admin na user_roles original ou admin na staff_roles) pode modificar as roles
CREATE POLICY "Admins controlam roles" ON public.staff_roles
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
);


-- Create gestor_diaries table
CREATE TABLE IF NOT EXISTS public.gestor_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_semana JSONB DEFAULT '[]'::jsonb,
  pedidos_cliente JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_diaries ENABLE ROW LEVEL SECURITY;

-- Create policies for gestor_diaries
-- Leitura: Gestor lê o seu próprio diário; Admins/CEOs/Gerentes leem todos.
CREATE POLICY "Leitura de gestor_diaries" ON public.gestor_diaries
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);

-- Escrita: Admins/CEOs/Gerentes editam todos; Gestores editam o seu próprio.
CREATE POLICY "Escrita de gestor_diaries" ON public.gestor_diaries
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);


-- Create gestor_diary_tasks table
CREATE TABLE IF NOT EXISTS public.gestor_diary_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tag TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_diary_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for gestor_diary_tasks
CREATE POLICY "Leitura de gestor_diary_tasks" ON public.gestor_diary_tasks
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);

CREATE POLICY "Escrita de gestor_diary_tasks" ON public.gestor_diary_tasks
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);


-- Create gestor_diary_logs table
CREATE TABLE IF NOT EXISTS public.gestor_diary_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  icon TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_diary_logs ENABLE ROW LEVEL SECURITY;

-- Policies for gestor_diary_logs
CREATE POLICY "Leitura de gestor_diary_logs" ON public.gestor_diary_logs
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);

CREATE POLICY "Escrita de gestor_diary_logs" ON public.gestor_diary_logs
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);


-- Create gestor_diary_clients table
CREATE TABLE IF NOT EXISTS public.gestor_diary_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Configurando', 'Em andamento')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_diary_clients ENABLE ROW LEVEL SECURITY;

-- Policies for gestor_diary_clients
CREATE POLICY "Leitura de gestor_diary_clients" ON public.gestor_diary_clients
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);

CREATE POLICY "Escrita de gestor_diary_clients" ON public.gestor_diary_clients
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);


-- Create gestor_diary_calendar table
CREATE TABLE IF NOT EXISTS public.gestor_diary_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gestor_diary_calendar ENABLE ROW LEVEL SECURITY;

-- Policies for gestor_diary_calendar
CREATE POLICY "Leitura de gestor_diary_calendar" ON public.gestor_diary_calendar
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);

CREATE POLICY "Escrita de gestor_diary_calendar" ON public.gestor_diary_calendar
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'gerente')
);
