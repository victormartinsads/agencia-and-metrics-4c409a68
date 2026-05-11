## Visão Geral do Gestor + edição completa de campanhas

### 1. Nova rota `/gestor` (visão geral) e renomear atual

- `/gestor` passa a ser a **Visão Geral** (lista de todos os clientes com alertas).
- A visão atual (cockpit de 1 cliente) vira `/gestor/:clientId`.
- Atualizar `App.tsx` e o link no `AppShell`.

### 2. Painel Visão Geral (`src/pages/GestorOverview.tsx`)

Layout: header com filtros (Apenas favoritos / Período / Busca) + grid responsivo de cards, 1 card por cliente.

Cada card mostra:
- Nome do cliente em CAIXA ALTA + estrela (favoritar via `useToggleAssignment` já existente).
- Badge de severidade (verde/amarelo/vermelho) calculado a partir de:
  - Status da BM/conta (`meta-account-status`).
  - % do budget consumido (vs `budget_alert_threshold_pct` do cliente).
  - CPA acima do alvo (`target_cpa_lead` × `cpa_alert_multiplier`, idem purchase).
- KPIs do cliente: Gasto 7d, Conversões, ROAS, CTR, # alertas ativos.
- Lista compacta dos 3 alertas mais críticos.
- Botão **"Abrir gestor →"** que navega para `/gestor/:clientId`.

Ordenação automática:
- Favoritos primeiro, depois por nº de alertas críticos desc, depois alfabético.

Hook novo `useGestorOverview(clientIds, period)`:
- Busca em paralelo `meta-ads` (cache 2h já existente) + `meta-account-status` para cada cliente.
- Calcula severidade do mesmo jeito que `AlertsPanel` (regras já implementadas).
- Trata "sem token" / "sem dados" como warning leve, não como erro fatal do card.

### 3. Edição completa de campanhas / adsets / ads

#### 3.1 Backend — estender `meta-ads-action`

Hoje só suporta `pause`, `activate`, `set_daily_budget`, `set_lifetime_budget`. Adicionar:

- `rename` — `{ name }`
- `set_bid_strategy` — `{ bid_strategy: "LOWEST_COST_WITHOUT_CAP" | "LOWEST_COST_WITH_BID_CAP" | "COST_CAP" }` + `bid_amount` opcional
- `set_bid_amount` — `{ value }` (centavos)
- `set_optimization_goal` — `{ optimization_goal }` (apenas adset)
- `set_billing_event` — `{ billing_event }` (apenas adset)
- `set_targeting` — `{ targeting }` (JSON Meta API; passar direto ao Graph)
- `set_start_end` — `{ start_time?, end_time? }`
- `update_creative` — somente nível `ad`, `{ creative: { ... } }` ou `{ creative_id }`
- `set_promoted_object` — adset

Bug do mesmo arquivo: import inválido `from "...supabase-js@2.103.0/cors"`. Trocar por `corsHeaders` literal (mesmo fix que fiz no `paid-media-chat`). Aplicar em `meta-ads-action`, `meta-ads-detail`, `meta-account-status`, `meta-optimization-suggestions`, `campaign-draft-ai`, `meta-campaign-create` se também afetados — verificar.

Validação Zod no body. Sempre limpar `meta_ads_cache` do cliente após mutação.

#### 3.2 Backend — estender `meta-ads-detail`

Adicionar campos retornados:
- Campaign: `objective`, `bid_strategy`, `buying_type`, `special_ad_categories`, `start_time`, `stop_time`, `budget_remaining`, `lifetime_budget`, `daily_budget`, `spend_cap`.
- AdSet: `optimization_goal`, `billing_event`, `bid_amount`, `bid_strategy`, `targeting`, `promoted_object`, `start_time`, `end_time`, `attribution_setting`.
- Ad: `creative{...}`, `effective_status`, `tracking_specs`, `preview_shareable_link`.
- Insights: TODAS as métricas que a Meta envia (já vem hoje em `insights.data[0]` — expor inteiro no painel "Métricas avançadas").

#### 3.3 Frontend — `CampaignEditPanel` (Sheet à direita)

Substitui o atual `CampaignDrillDown` (refator). Estrutura em abas:

1. **Visão geral** — KPIs principais + funil interno (já existente).
2. **Editar campanha** — formulário com: nome, status, objetivo (read-only), bid strategy, daily/lifetime budget, spend cap, datas de início/fim. Botão Salvar.
3. **Conjuntos (AdSets)** — tabela com inline edit por linha; clicar abre drawer secundário com formulário completo (nome, status, optimization_goal, billing_event, bid_amount, datas, budget, **targeting JSON editor** com syntax highlight + preview de público).
4. **Anúncios (Ads)** — tabela com thumbnail do criativo, status; clicar abre editor com: nome, status, troca de creative (selecionar de criativos existentes da conta via `/act_xxx/adcreatives` ou enviar novo `image_hash` + texto + título + CTA + link).
5. **Métricas (Meta completas)** — todas as colunas Meta agrupadas (delivery, engagement, video, conversions, cost, attribution). Selector de granularidade (campaign/adset/ad) + breakdown opcional (age, gender, placement, device).

Reutiliza `meta-ads-action` para todas as mutações; cada Save invalida queries.

### 4. Rotas e navegação

- `/gestor` → `GestorOverview`
- `/gestor/:clientId` → `GestorView` (atual; lê `clientId` da URL em vez de state).
- Botão "Voltar" no header do `GestorView` para `/gestor`.
- `AppShell` "Visão do Gestor" aponta para `/gestor`.

### 5. Detalhes técnicos

- Tudo mantém o estilo híbrido Meta + TráfegoIA (gradiente, cards arredondados).
- Cores semânticas: severidade `--meta-red`/`--meta-orange`/`--meta-green` já existem.
- Permissões: tela e ações exigem admin/editor (RLS já garante).
- Cache: respeita `meta_ads_cache` (2h). Após qualquer ação, invalida o cache do cliente afetado.
- Performance: requests em paralelo no overview com `Promise.all`, esqueletos de loading por card.

### 6. Arquivos afetados

**Criar**
- `src/pages/GestorOverview.tsx`
- `src/hooks/useGestorOverview.ts`
- `src/components/gestor/ClientOverviewCard.tsx`
- `src/components/gestor/CampaignEditPanel.tsx` (substitui `CampaignDrillDown`)
- `src/components/gestor/AdSetEditDrawer.tsx`
- `src/components/gestor/AdEditDrawer.tsx`
- `src/components/gestor/TargetingEditor.tsx`

**Editar**
- `src/App.tsx` — adicionar rotas
- `src/pages/GestorView.tsx` — ler `clientId` da URL, botão voltar, usar novo `CampaignEditPanel`
- `supabase/functions/meta-ads-action/index.ts` — fix CORS + novas ações + Zod
- `supabase/functions/meta-ads-detail/index.ts` — fix CORS + mais campos
- `src/components/layout/AppShell.tsx` — link Gestor → `/gestor`

### 7. Fora do escopo desta entrega

- Criação de creatives novos com upload de imagem (já existe `campaign-draft-ai` para isso; integrar como atalho mas não recriar).
- Editor visual de público (mantemos editor JSON com validação; visual pode vir depois).
