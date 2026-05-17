
## Objetivo

Transformar todos os dashboards (Visão Geral, Analytics, Como Estamos, Funil) em painéis modulares onde:

1. Cada bloco aceita escolha de **fonte de dados** (Google Ads, Sheets multi-planilha, Meta Ads, Instagram, GA4, Manual).
2. Blocos podem ser **arrastados e redimensionados**.
3. O dashboard **Analytics** ganha todos os blocos do print de referência (mantendo a identidade visual atual: tema escuro + verde neon).
4. A configuração de fontes fica em um painel limpo, único e fácil de operar.

---

## Etapa 1 — Novos blocos do Analytics (visual já existente)

Adicionar ao `AnalyticsTab.tsx` (mantendo `PanelCard` + verde neon):

- Sessions by Country (barras verticais com bandeira)
- Sessions by Campaign (barras horizontais)
- Sessions by Device Category (donut)
- Landing Pages (tabela)
- Events (tabela com nome / contagem / %)
- Sessions by Source/Medium (barras empilhadas, toggle Absoluto/%)
- User Count: New vs Returning (donut)
- Sessions by Browser (barras verticais)
- Engagement Bucket (0–30s, 30–60s, 1–3m, 3–5m, 5–10m) — barras

Backend (`google-analytics` edge function): adicionar dimensions `country`, `deviceCategory`, `landingPage`, `eventName`, `browser`, `sessionEngagementDuration` e `newVsReturning`. Cada widget é opcional, então só renderiza se vier dado.

## Etapa 2 — Sistema de "Fonte de dados por bloco"

Nova tabela `dashboard_block_sources`:
```
client_id, dashboard_key (overview|analytics|como_estamos|funnel),
block_id, source_type (ga4|meta|google_ads|sheet|instagram|manual),
config jsonb  -- { metric, sheetId, range, campaignId, accountId, value... }
```

Hook `useBlockSource(dashboardKey, blockId)` que retorna `{ source, save, data }`.

Componente reutilizável `<BlockSourceMenu />` aberto via **clique no card** (ou ícone de engrenagem que já aparece no editMode). Modal limpo com:
- Tabs por tipo de fonte (ícones grandes, descrição curta)
- Campos contextuais por tipo
- Preview do valor/dataset retornado
- Botão "Salvar"

`PanelCard` ganha prop `onConfigureSource` — quando setada, aparece engrenagem no canto e/ou o card vira clicável em modo edição.

## Etapa 3 — Drag & resize

Adicionar `react-grid-layout` (já alinhado ao stack). Wrapper `<GridDashboard>` que:
- Persiste posições em `localStorage` (chave `dashboard-layout:${dashboardKey}:${clientId}`)
- Em modo "Editar layout" libera drag/resize; fora desse modo o layout fica travado
- Cada `PanelCard` vira um item da grid (12 cols, rowHeight ~ 60px)

Aplicado a: Overview Premium, AnalyticsTab, ComoEstamosTab (blocos principais), FunnelAnalysisTab.

## Etapa 4 — Painel central de "Fontes de dados" (ClientSettings)

Nova aba **"Fontes de dados"** com cards por integração:
- Google Ads (status, customer ID)
- Google Analytics 4 (status, property)
- Meta Ads (contas vinculadas)
- Instagram (conta)
- Google Sheets — **lista** de planilhas (botão +Adicionar planilha, cada uma com nome, URL, range, último sync)
- Entradas manuais (lista de métricas manuais criadas)

UI: grid 2 colunas, cada card com ícone, status (verde/cinza), botões Conectar/Configurar/Remover. Sem ruído visual extra.

## Detalhes técnicos

```text
src/
  components/
    dashboard/
      shared/
        GridDashboard.tsx          // wrapper react-grid-layout
        BlockSourceMenu.tsx        // modal de seleção de fonte
        useBlockSource.ts
    analytics/
      AnalyticsTab.tsx             // novos blocos
      widgets/                     // 1 arquivo por widget novo
    settings/
      DataSourcesPanel.tsx         // novo painel central
  hooks/
    useDashboardLayout.ts
    useClientSheets.ts             // multi-planilhas
supabase/migrations/
  *_block_sources_and_sheets.sql   // dashboard_block_sources + client_sheets
supabase/functions/
  google-analytics/index.ts        // novos dimensions
```

Dependência nova: `react-grid-layout` + `@types/react-grid-layout`.

Mantém estilo: `bg-card`, `border-border`, `text-primary` verde neon, fonte `Syne` nos títulos.

---

## Entregáveis em ordem

1. Migration (block_sources, client_sheets).
2. Backend GA4 — novos dimensions.
3. `GridDashboard` + integração em Overview e Analytics.
4. Novos widgets do print no AnalyticsTab.
5. `BlockSourceMenu` + hook, plugado em todos os PanelCards.
6. `DataSourcesPanel` em ClientSettings.
7. Aplicar grid nos dashboards restantes (Como Estamos, Funil).

Quer que eu siga nessa ordem? Posso começar entregando 1–4 num primeiro turno (já visível no preview) e 5–7 no seguinte para não estourar.
