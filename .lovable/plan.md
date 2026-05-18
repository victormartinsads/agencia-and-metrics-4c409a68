## O que será feito

Hoje, na aba **Análise de Funis**, cada card (F1, F2, F3...) calcula KPIs automaticamente a partir do Meta Ads. Você quer:

1. **Editar qualquer métrica manualmente** no card do funil (e adicionar novas), com persistência por período.
2. **Sincronizar** esses valores entre o card resumido e a **Análise completa** (modal cheia tela).
3. **Criar funis manuais do zero** (ex.: um funil "Google Ads" totalmente preenchido à mão), sem depender de campanhas do Meta.

---

## 1. Override manual por métrica (sincronizado)

Cada KPI do card (`Investimento`, `Faturamento`, `ROAS`, `Vendas`, `Leads`, `Seguidores`, etc.) vai ter um **ícone de lápis** ao passar o mouse. Clicando:

- Abre um popover com:
  - Campo numérico para o valor manual
  - Botão "Usar valor automático" (remove override)
- Salva em `funnel_period_metrics` (tabela já existente), atrelado ao período selecionado no header (ex.: últimos 7 dias).
- O valor manual **prevalece** sobre o cálculo automático tanto no card quanto na Análise completa.

Métricas calculadas (ROAS, CPL, CPV, CPS) recalculam automaticamente a partir dos valores manuais salvos.

Também será possível **adicionar métricas personalizadas** (ex.: "Visualizações de Reels", "Inscritos no canal") pelo mesmo popover de "Métricas visíveis" — basta digitar nome + valor.

### Sincronização com Análise completa

A Análise completa (modal de tela cheia) hoje renderiza KPIs fixos calculados do Meta. Vou trocar para usar o **mesmo conjunto de métricas e overrides** do card. Assim:

- Editou no card → aparece na Análise completa
- Editou na Análise completa → aparece no card
- O KPI Strip do modal passa a respeitar quais métricas você selecionou no card

---

## 2. Funil 100% manual (Google Ads e outros)

Botão **"+ Novo funil manual"** no topo da aba Análise de Funis. Ao clicar:

- Pede: código (ex.: `GADS`), nome (ex.: "Google Ads — Performance Max"), e ícone/cor opcional.
- Cria um card vazio, no mesmo layout dos outros, **sem campanhas Meta vinculadas**.
- Todas as métricas começam em branco — você edita pelo lápis (mesmo fluxo do item 1).
- Persistido em uma nova tabela `funnel_manual_groups` (cliente, código, label, ordem).
- Pode ser renomeado, removido e ter Análise completa própria.

Esses funis manuais aparecem na lista junto com os automáticos, marcados com um badge "MANUAL".

---

## Detalhes técnicos

### Banco
- **Nova tabela** `funnel_manual_groups`:
  - `client_id`, `code`, `label`, `sort_order`, `created_by`
  - RLS: leitura/edição via admin/editor (mesmo padrão dos outros recursos do cliente)
- **Reusa** `funnel_period_metrics` (já existe) para overrides — chave: `client_id + funnel_code + metric_key + period_start + period_end`. Já tem o hook `useSaveFunnelPeriodMetric`.
- **Reusa** localStorage `funnel-preview-kpis` para métricas visíveis e adiciona suporte a chaves customizadas.

### Componentes
- `FunnelPreviewCard.tsx`: 
  - Cada `KpiCardPremium` ganha edição inline (pencil + popover com input + "usar automático").
  - Lê overrides via `useFunnelPeriodMetrics(clientId, funnelCode, datePreset)`.
  - Aceita métricas custom (objeto `{key, label, value, isManual}`) no catálogo.
- `FunnelAnalysisTab.tsx`:
  - Botão "+ Novo funil manual" + dialog de criação.
  - Mescla `activeFunnels` (do Meta) com `manualFunnels` (do banco).
- `FunnelPremiumDetailDialog.tsx`:
  - KPI Strip passa a vir da mesma fonte que o card (mesmas métricas selecionadas + mesmos overrides).
  - Suporta funis manuais (sem `campaigns`).
- Novo hook: `useManualFunnels(clientId)` (list/create/delete/rename).

### Period scope
Os overrides ficam ligados ao período exibido (`period_start`/`period_end` derivados do `datePreset`). Trocar para "últimos 30 dias" mostra outro conjunto de valores (e edição cria novo registro para aquele período).

---

## Fora de escopo
- Importação automática do Google Ads para preencher o funil manual (continua manual mesmo).
- Compartilhamento dos overrides com a aba "Como Estamos" (que já tem seu próprio fluxo de inputs semanais).
