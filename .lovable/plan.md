## O que será feito

Três entregas independentes na Análise de Funis e no Como Estamos.

---

### 1. Funis do Google Ads (na aba Análise de Funis)

Hoje os funis (F1, F2…) são derivados exclusivamente das campanhas do Meta. Vou adicionar **um bloco paralelo de funis do Google Ads**, com a mesma estrutura visual e o mesmo nível de edição (lápis por métrica, métricas visíveis, override por período, análise completa, notas).

- **Agrupamento por funil** das campanhas Google Ads usando o mesmo regex de `extractFunnelCode` (F1, F2, F3…) sobre o nome da campanha. Campanhas sem código viram um grupo único "Google Ads — Sem Funil" (igual ao fallback do Meta).
- **Catálogo de métricas Google Ads** (diferente do Meta):
  - Investimento (cost), Impressões, Cliques, CTR, CPC médio, Conversões, CPA, Receita, ROAS, Taxa de Conversão.
- **Cards reutilizam** `FunnelPreviewCard` em modo "google ads" — mesmo lápis para override manual (usa a tabela `funnel_period_metrics` já existente, com `funnel_code` prefixado por `GADS-` para não colidir com o Meta).
- **Análise completa** (modal) também funciona, mostrando as campanhas Google daquele funil, com tabela de campanhas e KPI strip equivalente.
- **Botão "Origem" no topo da aba** alterna entre `Meta`, `Google Ads` e `Todos`. Quando "Todos", os dois blocos aparecem empilhados com um divisor.

### 2. Visão "por Campanha" na Análise de Funis

Botão de toggle no topo: **`Por Funil` | `Por Campanha`**.

- **Por Funil** (atual): cards agrupam campanhas por F1, F2…
- **Por Campanha**: cada campanha vira um card individual, no mesmo layout do `FunnelPreviewCard`, usando o nome da campanha como label. Override de métricas, métricas visíveis e análise completa funcionam por campanha (chave `CAMP-<campaignId>`).
- Funciona tanto para Meta quanto para Google Ads (respeita o toggle de Origem do item 1).
- Busca textual continua filtrando a lista renderizada.

### 3. Editar o nome do funil no "Como Estamos"

Na seção **🔻 Funil de Conversão** (`EditableFunnel.tsx`), o título "🔻 Funil de Conversão" passa a ser editável inline (clique no lápis ao lado → input → enter para salvar). O nome é persistido por cliente em uma nova coluna `display_name` em `funnel_stages` (ou, mais simples, em `funnel_custom_labels` reaproveitando com `funnel_code = 'como-estamos'`).

---

## Detalhes técnicos

### Banco
- **Nenhuma nova tabela necessária** — reusa `funnel_period_metrics`, `funnel_card_config`, `funnel_custom_labels`.
- Convenção de chaves para evitar colisão:
  - Meta por funil: `F1`, `F2`… (atual).
  - Google Ads por funil: `GADS-F1`, `GADS-F2`…
  - Meta por campanha: `CAMP-<metaCampaignId>`.
  - Google Ads por campanha: `GADS-CAMP-<googleCampaignId>`.
  - Nome do funil Como Estamos: `funnel_custom_labels` com `funnel_code = '__como_estamos__'`.

### Frontend
- `FunnelAnalysisTab.tsx`:
  - Novo estado `viewMode: "funnel" | "campaign"` e `source: "meta" | "google" | "all"`.
  - Novo hook `useGoogleAdsFunnelGroups(clientId, datePreset)` que pega `useGoogleAds` e agrupa por `extractFunnelCode`.
  - Renderiza dois blocos (Meta / Google) conforme o filtro.
- `FunnelPreviewCard.tsx`:
  - Aceita prop `source: "meta" | "google"` e `googleCampaigns?: GoogleAdsCampaign[]` opcional.
  - Calcula KPIs a partir do conjunto certo de dados, usando catálogo de métricas Google quando `source==="google"`.
- `FunnelPremiumDetailDialog.tsx`: mesmo tratamento (recebe `source` + dados Google).
- `EditableFunnel.tsx` (Como Estamos): título editável via novo hook `useFunnelDisplayName`.

### Fora de escopo
- Tradução automática de métricas Meta ↔ Google (são catálogos diferentes por design).
- Mesclar campanhas Meta + Google num único funil F1 (continuam separados visualmente).
- Importação histórica de Google Ads para preencher períodos anteriores.
