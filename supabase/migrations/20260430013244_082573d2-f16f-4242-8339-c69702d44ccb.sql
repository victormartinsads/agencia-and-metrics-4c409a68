-- Configuração de quais métricas exibir em cada card de funil
CREATE TABLE IF NOT EXISTS public.funnel_card_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '["spend","clicks","conversions","cpa","roas"]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, funnel_code)
);

ALTER TABLE public.funnel_card_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage funnel_card_config" ON public.funnel_card_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read funnel_card_config" ON public.funnel_card_config
  FOR SELECT TO anon USING (true);

CREATE TRIGGER update_funnel_card_config_updated_at
  BEFORE UPDATE ON public.funnel_card_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notas com data por funil (substitui/complementa funnel_notes que era global)
CREATE TABLE IF NOT EXISTS public.funnel_dated_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  funnel_code text NOT NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL DEFAULT '',
  author text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_dated_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage funnel_dated_notes" ON public.funnel_dated_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public read funnel_dated_notes" ON public.funnel_dated_notes
  FOR SELECT TO anon USING (true);

CREATE INDEX idx_funnel_dated_notes_client_funnel
  ON public.funnel_dated_notes(client_id, funnel_code, note_date DESC);

CREATE TRIGGER update_funnel_dated_notes_updated_at
  BEFORE UPDATE ON public.funnel_dated_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();