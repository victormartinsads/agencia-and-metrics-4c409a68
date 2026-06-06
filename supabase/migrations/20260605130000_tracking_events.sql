-- ============================================================
-- TrackingHub — Tabela de configuração de eventos por cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Identificação do evento
  event_name TEXT NOT NULL,              -- 'PageView', 'ViewContent', 'Purchase', ou nome custom
  display_name TEXT,                     -- Label amigável no UI
  is_standard BOOLEAN NOT NULL DEFAULT true,  -- false = evento personalizado
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Gatilho do evento
  trigger_type TEXT NOT NULL DEFAULT 'page_load',
  -- valores: 'page_load' | 'checkout_click' | 'form_submit'
  --         | 'element_visible' | 'element_click' | 'scroll_depth' | 'time_on_page'

  -- Configuração do gatilho
  trigger_selector TEXT,    -- Seletor CSS para element_click / element_visible
  trigger_value TEXT,       -- Ex: "50" para scroll_depth (%), "30" para time_on_page (seg)

  -- Parâmetros extras do evento (enviados junto ao CAPI/GA4)
  custom_params JSONB DEFAULT '{}'::jsonb,
  -- Ex: { "content_name": "Meu Produto", "value": 297, "currency": "BRL" }

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tracking_events_client ON public.tracking_events(client_id);

-- RLS
CREATE POLICY "tracking_events: admin/editor full"
  ON public.tracking_events FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "tracking_events: service role"
  ON public.tracking_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER trg_tracking_events_updated
  BEFORE UPDATE ON public.tracking_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Inserir eventos padrão ao criar tracking_config ──────────────────────────
-- Função que garante os eventos padrão para um cliente
CREATE OR REPLACE FUNCTION public.tracking_ensure_events(_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Só insere se não existirem ainda
  IF NOT EXISTS (SELECT 1 FROM public.tracking_events WHERE client_id = _client_id) THEN
    INSERT INTO public.tracking_events
      (client_id, event_name, display_name, is_standard, enabled, trigger_type, sort_order)
    VALUES
      (_client_id, 'PageView',         'Visualização de Página',     true, true,  'page_load',       0),
      (_client_id, 'ViewContent',      'Visualização de Oferta',     true, false, 'page_load',       1),
      (_client_id, 'InitiateCheckout', 'Clique no Checkout',         true, true,  'checkout_click',  2),
      (_client_id, 'Lead',             'Envio de Formulário',        true, false, 'form_submit',     3),
      (_client_id, 'Purchase',         'Compra (via webhook)',        true, true,  'webhook_only',    4);
  END IF;
END $$;
