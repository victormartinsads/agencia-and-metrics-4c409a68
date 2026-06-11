-- Alter gestor_scorecard to add new competencies
ALTER TABLE public.gestor_scorecard 
  ADD COLUMN IF NOT EXISTS trafego NUMERIC(4,2) DEFAULT 8.0 CHECK (trafego >= 0 AND trafego <= 10),
  ADD COLUMN IF NOT EXISTS traqueamento NUMERIC(4,2) DEFAULT 8.0 CHECK (traqueamento >= 0 AND traqueamento <= 10),
  ADD COLUMN IF NOT EXISTS analise_dados NUMERIC(4,2) DEFAULT 8.0 CHECK (analise_dados >= 0 AND analise_dados <= 10),
  ADD COLUMN IF NOT EXISTS copy NUMERIC(4,2) DEFAULT 8.0 CHECK (copy >= 0 AND copy <= 10),
  ADD COLUMN IF NOT EXISTS comercial NUMERIC(4,2) DEFAULT 8.0 CHECK (comercial >= 0 AND comercial <= 10);

-- Migrate old values from tecnica to trafego if they exist
UPDATE public.gestor_scorecard SET trafego = COALESCE(tecnica, 8.0);

-- Drop old columns
ALTER TABLE public.gestor_scorecard 
  DROP COLUMN IF EXISTS tecnica,
  DROP COLUMN IF EXISTS velocidade;

-- Seed default values for existing growth managers in public.gestor_scorecard
-- Mariana Growth (mock)
UPDATE public.gestor_scorecard 
SET trafego = 8.8, traqueamento = 8.5, analise_dados = 9.0, copy = 8.0, comercial = 8.2, proatividade = 9.0, comunicacao = 9.5
WHERE gestor_id IN (SELECT id FROM auth.users WHERE email = 'mariana.growth@agenciaand.com.br');

-- José Renato
UPDATE public.gestor_scorecard 
SET trafego = 8.5, traqueamento = 7.5, analise_dados = 8.0, copy = 8.5, comercial = 7.0, proatividade = 8.0, comunicacao = 8.0
WHERE gestor_id IN (SELECT id FROM auth.users WHERE email = 'jr.rodrigs31@gmail.com');

-- Daine Stoque
UPDATE public.gestor_scorecard 
SET trafego = 8.2, traqueamento = 8.5, analise_dados = 8.0, copy = 7.5, comercial = 8.0, proatividade = 8.0, comunicacao = 8.0
WHERE gestor_id IN (SELECT id FROM auth.users WHERE email = 'contato.dainestoque@gmail.com');

-- Victor Martins
UPDATE public.gestor_scorecard 
SET trafego = 8.3, traqueamento = 8.0, analise_dados = 8.0, copy = 7.0, comercial = 7.5, proatividade = 8.0, comunicacao = 8.0
WHERE gestor_id IN (SELECT id FROM auth.users WHERE email = 'victormartinsads@gmail.com');
