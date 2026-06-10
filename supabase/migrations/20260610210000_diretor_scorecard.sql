-- Create gestor_scorecard table
CREATE TABLE IF NOT EXISTS public.gestor_scorecard (
  gestor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  proatividade NUMERIC(4,2) DEFAULT 8.0 CHECK (proatividade >= 0 AND proatividade <= 10),
  comunicacao NUMERIC(4,2) DEFAULT 8.0 CHECK (comunicacao >= 0 AND comunicacao <= 10),
  velocidade NUMERIC(4,2) DEFAULT 8.0 CHECK (velocidade >= 0 AND velocidade <= 10),
  tecnica NUMERIC(4,2) DEFAULT 8.0 CHECK (tecnica >= 0 AND tecnica <= 10),
  forces JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  courses JSONB DEFAULT '[]'::jsonb,
  deadlines JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create gestor_profile_meta table if not exists (in case it didn't exist in the DB schema)
CREATE TABLE IF NOT EXISTS public.gestor_profile_meta (
  gestor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salary TEXT DEFAULT '',
  role_override TEXT DEFAULT '',
  name_override TEXT DEFAULT '',
  email_override TEXT DEFAULT '',
  banner_override TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gestor_scorecard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestor_profile_meta ENABLE ROW LEVEL SECURITY;

-- Policies for gestor_scorecard
DROP POLICY IF EXISTS "Leitura de gestor_scorecard" ON public.gestor_scorecard;
CREATE POLICY "Leitura de gestor_scorecard" ON public.gestor_scorecard
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita de gestor_scorecard" ON public.gestor_scorecard;
CREATE POLICY "Escrita de gestor_scorecard" ON public.gestor_scorecard
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_role(auth.uid(), 'admin')
    OR public.has_staff_role(auth.uid(), 'ceo')
    OR public.has_staff_role(auth.uid(), 'diretor')
  );

-- Policies for gestor_profile_meta
DROP POLICY IF EXISTS "Leitura de gestor_profile_meta" ON public.gestor_profile_meta;
CREATE POLICY "Leitura de gestor_profile_meta" ON public.gestor_profile_meta
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escrita de gestor_profile_meta" ON public.gestor_profile_meta;
CREATE POLICY "Escrita de gestor_profile_meta" ON public.gestor_profile_meta
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_staff_role(auth.uid(), 'admin')
    OR public.has_staff_role(auth.uid(), 'ceo')
    OR public.has_staff_role(auth.uid(), 'diretor')
  );

-- 1. Create Mariana Growth user in auth.users if not exists
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  is_anonymous
) VALUES (
  '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'mariana.growth@agenciaand.com.br',
  '$2a$10$I5dPOEjXHYtUelOCT6AWYurcNo1Izq6DmfCvYwfOVGKKwy8mujuXu',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email_verified":true}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated',
  false
) ON CONFLICT (id) DO NOTHING;



-- Get the exact ID of Mariana Growth user
DO $$
DECLARE
  v_mariana_id UUID;
  v_jose_id UUID;
  v_daine_id UUID;
  v_victor_id UUID;
BEGIN
  -- Resolve IDs
  SELECT id INTO v_mariana_id FROM auth.users WHERE email = 'mariana.growth@agenciaand.com.br';
  SELECT id INTO v_jose_id FROM auth.users WHERE email = 'jr.rodrigs31@gmail.com';
  SELECT id INTO v_daine_id FROM auth.users WHERE email = 'contato.dainestoque@gmail.com';
  SELECT id INTO v_victor_id FROM auth.users WHERE email = 'victormartinsads@gmail.com';

  -- 2. Insert Mariana in profiles and staff_roles
  IF v_mariana_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, email, role_title)
    VALUES (v_mariana_id, 'Mariana Growth', 'mariana.growth@agenciaand.com.br', 'Head of Performance')
    ON CONFLICT (user_id) DO UPDATE SET full_name = 'Mariana Growth', role_title = 'Head of Performance';

    INSERT INTO public.staff_roles (user_id, role)
    VALUES (v_mariana_id, 'gestor')
    ON CONFLICT (user_id) DO UPDATE SET role = 'gestor';
  END IF;

  -- 3. Seed profile override banners and roles
  IF v_mariana_id IS NOT NULL THEN
    INSERT INTO public.gestor_profile_meta (gestor_id, role_override, name_override, email_override)
    VALUES (v_mariana_id, 'Head of Performance', 'Mariana Growth', 'mariana.growth@agenciaand.com.br')
    ON CONFLICT (gestor_id) DO UPDATE SET role_override = 'Head of Performance', name_override = 'Mariana Growth';
  END IF;

  IF v_jose_id IS NOT NULL THEN
    INSERT INTO public.gestor_profile_meta (gestor_id, role_override, name_override, email_override)
    VALUES (v_jose_id, 'Gestor de Tráfego', 'José Renato', 'jr.rodrigs31@gmail.com')
    ON CONFLICT (gestor_id) DO UPDATE SET role_override = 'Gestor de Tráfego', name_override = 'José Renato';
  END IF;

  IF v_daine_id IS NOT NULL THEN
    INSERT INTO public.gestor_profile_meta (gestor_id, role_override, name_override, email_override)
    VALUES (v_daine_id, 'Gestora de Escala', 'Daine Stoque', 'contato.dainestoque@gmail.com')
    ON CONFLICT (gestor_id) DO UPDATE SET role_override = 'Gestora de Escala', name_override = 'Daine Stoque';
  END IF;

  IF v_victor_id IS NOT NULL THEN
    INSERT INTO public.gestor_profile_meta (gestor_id, role_override, name_override, email_override)
    VALUES (v_victor_id, 'Gestor de Tráfego', 'Victor Martins', 'victormartinsads@gmail.com')
    ON CONFLICT (gestor_id) DO UPDATE SET role_override = 'Gestor de Tráfego', name_override = 'Victor Martins';
  END IF;

  -- 4. Seed scorecard records
  -- Mariana Growth Scorecard
  IF v_mariana_id IS NOT NULL THEN
    INSERT INTO public.gestor_scorecard (gestor_id, proatividade, comunicacao, velocidade, tecnica, forces, improvements, courses, deadlines)
    VALUES (
      v_mariana_id,
      9.0, 9.5, 7.8, 8.5,
      '["Comunicação 9,5", "Proatividade 9", "Cultura 10"]'::jsonb,
      '["Organização de Tarefas", "Técnica no Tráfego"]'::jsonb,
      '["Growth Strategy & CRO", "Gestão de Equipes Ágeis", "Ads Avançado"]'::jsonb,
      '[{"title": "ORGANIZAÇÃO", "timeframe": "4-6 sem"}, {"title": "TÉCNICA", "timeframe": "8-10 sem"}]'::jsonb
    ) ON CONFLICT (gestor_id) DO NOTHING;
  END IF;

  -- José Renato Scorecard
  IF v_jose_id IS NOT NULL THEN
    INSERT INTO public.gestor_scorecard (gestor_id, proatividade, comunicacao, velocidade, tecnica, forces, improvements, courses, deadlines)
    VALUES (
      v_jose_id,
      8.0, 8.0, 7.8, 8.3,
      '["Cultura 10", "Proatividade 10", "Técnica 8"]'::jsonb,
      '["Comunicação", "Organização"]'::jsonb,
      '["Curso de Copy para Ads", "GA4 + GTM", "Treino de comunicação/briefing"]'::jsonb,
      '[{"title": "ORGANIZAÇÃO", "timeframe": "4-8 sem"}, {"title": "ORGANIZAÇÃO", "timeframe": "6-8 sem"}]'::jsonb
    ) ON CONFLICT (gestor_id) DO NOTHING;
  END IF;

  -- Daine Stoque Scorecard
  IF v_daine_id IS NOT NULL THEN
    INSERT INTO public.gestor_scorecard (gestor_id, proatividade, comunicacao, velocidade, tecnica, forces, improvements, courses, deadlines)
    VALUES (
      v_daine_id,
      8.0, 8.0, 7.8, 8.3,
      '["Cultura 10", "Técnica 8,5", "Proatividade 8"]'::jsonb,
      '["Escrita/Copy", "Trackeamento"]'::jsonb,
      '["Frameworks de copy", "GA4 / GTM", "Playbook de comunicação"]'::jsonb,
      '[{"title": "TRACKEAMENTO", "timeframe": "4-6 sem"}, {"title": "COPY", "timeframe": "8-10 sem"}]'::jsonb
    ) ON CONFLICT (gestor_id) DO NOTHING;
  END IF;

  -- Victor Martins Scorecard
  IF v_victor_id IS NOT NULL THEN
    INSERT INTO public.gestor_scorecard (gestor_id, proatividade, comunicacao, velocidade, tecnica, forces, improvements, courses, deadlines)
    VALUES (
      v_victor_id,
      8.0, 8.0, 7.8, 8.3,
      '["Proatividade 8", "Cultura 8"]'::jsonb,
      '["Organização"]'::jsonb,
      '["Curso GTM", "Meta Ads Avançado"]'::jsonb,
      '[{"title": "TÉCNICA", "timeframe": "4-6 sem"}]'::jsonb
    ) ON CONFLICT (gestor_id) DO NOTHING;
  END IF;

END $$;
