## Objetivo

Unificar a linguagem visual das três telas principais do dashboard do cliente — **Visão Geral**, **Como Estamos** e **Análise de Funis** — usando como referência o template enviado (cards pretos com bordas suaves, neon verde, donuts, funil em pílulas verticais, tabelas de dimensões com paginação) e mantendo o melhor do que já temos. Foco em: clareza, densidade controlada, menos cliques, menos opções soltas na tela.

## Princípios de UX/UI

1. **Um único "card system"**: todos os blocos viram `SectionCard` com header (ícone + título + ações) e área de conteúdo. Mesmo radius, mesma borda, mesmo padding.
2. **Hierarquia clara**: KPIs grandes no topo → gráficos no meio → tabelas no rodapé. Variações (▲/▼ %) sempre ao lado do valor, nunca em badges separados.
3. **Tirar fricção**: 
   - Toolbars de configuração escondidas atrás de um único menu ⋯ por card (mover, editar métricas, ocultar).
   - Modo de edição sai da tela principal e vira um botão "Personalizar" no header da página.
   - Filtros redundantes (ex.: "Só ativas" + "Campanha" + seletor de período em locais diferentes) consolidados numa única **toolbar fixa** no topo.
4. **Densidade visual do template**: fundo `surface` quase preto, cards `surface-elevated`, números grandes em `tabular-nums`, neon verde (`--primary`) só em destaques (donuts, linhas de gráfico, valor principal). Cinza para tudo o mais.
5. **Mobile/A4**: grid de 12 colunas mantém-se; cards colapsam para 1 coluna abaixo de `md`.

## Telas

### 1. Visão Geral (`OverviewRedesign.tsx`)

Substituir o layout atual de blocos soltos por uma estrutura de 3 faixas no estilo do template:

```text
┌──────────────────────────────────────────────────────────────┐
│ KPI ROW: Investimento · Faturamento · ROAS · Vendas · Leads  │  (5 mini-cards com delta)
├──────────────────┬──────────────────┬────────────────────────┤
│ Funil de         │ Dimensões Gerais │ Dimensões Detalhadas   │
│ Métricas         │ (donut canal +   │ (tabela idade/região   │
│ (pílulas verdes) │ donut gênero)    │ com paginação)         │
├──────────────────┴──────────────────┴────────────────────────┤
│ Faturamento × Vendas (linha+barras)  │ Melhores Anúncios     │
├──────────────────────────────────────┴───────────────────────┤
│ Tabela de Campanhas (Custo, Impressões, CPM, CPC, Compras…) │
└──────────────────────────────────────────────────────────────┘
```

Mudanças concretas:
- Novo componente `MetricFunnelPills` (substitui o funil atual): pílulas verticais empilhadas com label + valor grande + delta abaixo (Impressões → Cliques → Visita LP → Carrinhos → Compras).
- Novo `DonutBreakdown` reaproveitável (canal, gênero, dispositivo) usando Recharts.
- Nova `DimensionTable` (idade, região, palavra-chave) com paginação compacta `1-7/7`.
- KPI row no topo substitui os blocos `Resultados Gerais` + `Custos` espalhados.
- Toolbar de edição: remove botões de mover/configurar de cada card; um único botão "Personalizar" abre um drawer com lista de blocos + drag handle.
- Mantém todo o backend atual (`useOverviewLayout`, `useMetricSources`, `useDashboardSheet`, `useMetaAds`).

### 2. Como Estamos (`ComoEstamosTab.tsx`)

Hoje é uma pilha vertical longa com muitos painéis. Reorganizar em **abas internas** + toolbar única:

```text
Toolbar: [Período] [Campanha ▼] [Só ativas] [IA on/off]      [Salvar diagnóstico]
├─ Saúde da conta (HealthScore + Receita/ROAS lado a lado, KPI row)
├─ Tabs internas:
│   • Performance  → KPIOverview + CampaignAnalysisTable + WinningAdSets
│   • Criativos    → CreativePodium + ObjectiveAnalysis
│   • Funil & Notas→ EditableFunnel + WeeklyNotesPanel
│   • IA           → EditableInsights + ComoEstamosAIReport (só se IA on)
```

Mudanças concretas:
- Remover `MetricSelector` solto da tela — vira ⋯ dentro do card de KPIs.
- Alertas só aparecem se houver alertas (já é assim, mas reposicionar acima da Saúde).
- Filtro de campanha do Pódio some — usa o filtro global da toolbar.
- Mantém todos os hooks (`useComoEstamos`, `useWeeklyNotes`, etc.).

### 3. Análise de Funis (`FunnelAnalysisTab.tsx`)

Manter a lógica de agrupamento mas redesenhar:

```text
┌───────────────────────────────────────────────────┐
│ KPI Row consolidado (Spend · ROAS · Compras · CPA·│
│  CTR · Impressões) — mesmo estilo da Visão Geral  │
├───────────────────────────────────────────────────┤
│ Toolbar: [busca] [agrupar por: funil/objetivo] [⚙ │
├───────────────────────────────────────────────────┤
│ Grid de FunnelCards redesenhados:                 │
│   • Header com pílula colorida do funil           │
│   • 4 mini-métricas grandes                       │
│   • Mini sparkline de spend/resultado             │
│   • Footer: nº campanhas · ⚙ · 📝                 │
└───────────────────────────────────────────────────┘
```

Mudanças concretas:
- Cards dos funis ganham sparkline (já temos `dailyMetrics`).
- Modal "Editar métricas consolidadas" mantém-se.
- `FunnelChatWidget` continua flutuante.

## Sistema de design (tokens)

Adicionar/garantir em `tailwind.config.ts` e `index.css`:
- `--surface` (fundo página), `--surface-elevated` (cards), `--surface-muted` (sub-blocos como pílulas) — já existem parcialmente.
- `--ring-primary-soft`: `hsl(var(--primary) / 0.15)` para halos dos donuts.
- Tipografia: números em `font-mono tabular-nums` para alinhamento; títulos de card `text-xs uppercase tracking-wide text-muted-foreground`.
- Sem cores hard-coded — todas via tokens HSL.

## Componentes novos / refatorados

| Arquivo | Tipo | Função |
|---|---|---|
| `src/components/dashboard/shared/SectionCard.tsx` | refator | Card único usado por todas as telas (header + ⋯ menu) |
| `src/components/dashboard/shared/KpiRow.tsx` | novo | Linha de mini-KPIs reutilizável |
| `src/components/dashboard/shared/DonutBreakdown.tsx` | novo | Donut Recharts com legenda lateral |
| `src/components/dashboard/shared/DimensionTable.tsx` | novo | Tabela paginada de dimensão |
| `src/components/dashboard/overview/MetricFunnelPills.tsx` | novo | Funil vertical em pílulas (referência das imagens) |
| `src/components/dashboard/overview/OverviewRedesign.tsx` | reescrita parcial | Novo layout em 3 faixas |
| `src/components/como-estamos/ComoEstamosTab.tsx` | refator | Toolbar única + abas internas |
| `src/components/funnel/FunnelAnalysisTab.tsx` | refator | KPI row + cards com sparkline |
| `src/components/funnel/FunnelCard.tsx` | refator | Novo header + sparkline |

## O que será removido (atrapalha hoje)

- Modo "Edit" inline com setas em cada card → vira drawer "Personalizar".
- Filtros duplicados (campanha aparecia em 3 lugares no Como Estamos).
- `MetricSelector` solto no topo do Como Estamos.
- Cards "Wrench / Mais detalhes" placeholder na Visão Geral.
- Bordas tracejadas e badges coloridos extras — mantém só verde para destaques positivos e vermelho discreto para deltas negativos.

## Fora do escopo

- Não muda backend, hooks de dados, edge functions ou esquema do banco.
- Não muda o `AppShell`/sidebar (já redesenhado).
- Não muda telas públicas (`/share`, `/podio`) nesta passada — podem herdar depois.

## Entrega em 4 passos

1. Tokens + `SectionCard` + `KpiRow` + `DonutBreakdown` + `DimensionTable` + `MetricFunnelPills` (base).
2. Reescrita da **Visão Geral** com a nova base.
3. Refator do **Como Estamos** (toolbar + tabs internas).
4. Refator da **Análise de Funis** (KPI row + cards com sparkline).
