-- Update staff_roles constraint and rename 'gerente' to 'diretor'
ALTER TABLE public.staff_roles DROP CONSTRAINT IF EXISTS staff_roles_role_check;
UPDATE public.staff_roles SET role = 'diretor' WHERE role = 'gerente';
ALTER TABLE public.staff_roles ADD CONSTRAINT staff_roles_role_check CHECK (role IN ('admin', 'ceo', 'diretor', 'gestor'));

-- Overwrite has_role function to support master admin bypass (victordbmartins@gmail.com)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  
  -- Master Admin has all roles (admin, editor)
  IF v_email = 'victordbmartins@gmail.com' THEN
    RETURN TRUE;
  END IF;
  
  -- Check user_roles table
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

-- Overwrite has_staff_role function to support master admin bypass
CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id UUID, _role VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = _user_id;
  
  -- Master Admin has admin role by default
  IF v_email = 'victordbmartins@gmail.com' AND _role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check staff_roles table
  RETURN EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

-- Recreate RLS policies for gestor_diaries with 'diretor' instead of 'gerente'
DROP POLICY IF EXISTS "Leitura de gestor_diaries" ON public.gestor_diaries;
DROP POLICY IF EXISTS "Escrita de gestor_diaries" ON public.gestor_diaries;

CREATE POLICY "Leitura de gestor_diaries" ON public.gestor_diaries
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

CREATE POLICY "Escrita de gestor_diaries" ON public.gestor_diaries
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

-- Recreate RLS policies for gestor_diary_tasks with 'diretor' instead of 'gerente'
DROP POLICY IF EXISTS "Leitura de gestor_diary_tasks" ON public.gestor_diary_tasks;
DROP POLICY IF EXISTS "Escrita de gestor_diary_tasks" ON public.gestor_diary_tasks;

CREATE POLICY "Leitura de gestor_diary_tasks" ON public.gestor_diary_tasks
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

CREATE POLICY "Escrita de gestor_diary_tasks" ON public.gestor_diary_tasks
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

-- Recreate RLS policies for gestor_diary_logs with 'diretor' instead of 'gerente'
DROP POLICY IF EXISTS "Leitura de gestor_diary_logs" ON public.gestor_diary_logs;
DROP POLICY IF EXISTS "Escrita de gestor_diary_logs" ON public.gestor_diary_logs;

CREATE POLICY "Leitura de gestor_diary_logs" ON public.gestor_diary_logs
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

CREATE POLICY "Escrita de gestor_diary_logs" ON public.gestor_diary_logs
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

-- Recreate RLS policies for gestor_diary_clients with 'diretor' instead of 'gerente'
DROP POLICY IF EXISTS "Leitura de gestor_diary_clients" ON public.gestor_diary_clients;
DROP POLICY IF EXISTS "Escrita de gestor_diary_clients" ON public.gestor_diary_clients;

CREATE POLICY "Leitura de gestor_diary_clients" ON public.gestor_diary_clients
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

CREATE POLICY "Escrita de gestor_diary_clients" ON public.gestor_diary_clients
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

-- Recreate RLS policies for gestor_diary_calendar with 'diretor' instead of 'gerente'
DROP POLICY IF EXISTS "Leitura de gestor_diary_calendar" ON public.gestor_diary_calendar;
DROP POLICY IF EXISTS "Escrita de gestor_diary_calendar" ON public.gestor_diary_calendar;

CREATE POLICY "Leitura de gestor_diary_calendar" ON public.gestor_diary_calendar
FOR SELECT TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);

CREATE POLICY "Escrita de gestor_diary_calendar" ON public.gestor_diary_calendar
FOR ALL TO authenticated
USING (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
)
WITH CHECK (
  auth.uid() = gestor_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_staff_role(auth.uid(), 'admin')
  OR public.has_staff_role(auth.uid(), 'ceo')
  OR public.has_staff_role(auth.uid(), 'diretor')
);
