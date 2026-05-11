
# Visão Gestor 2.0 — Plano completo

Transformar `/gestor` em um cockpit estilo Gerenciador da Meta, com alertas, mini-dashboard agregado, sugestões de otimização (com aprovação humana), chat IA contextual e criação de campanhas via prompt.

---

## 1. Alertas (header da Visão Gestor)

Painel fixo no topo com 3 tipos de alerta por cliente:

- **Conta/BM com problema** — status do ad account ≠ `ACTIVE` (1=ACTIVE, 2=DISABLED, 3=UNSETTLED, 7=PENDING_RISK_REVIEW, 9=IN_GRACE_PERIOD, etc).
- **Orçamento baixo / próximo do limite** — gasto do dia ≥ X% do daily budget agregado das campanhas ativas.
- **CPA elevado** — para campanhas categorizadas como leads ou compras, CPA atual > limite configurado pelo cliente.

Thresholds **configuráveis por cliente** numa nova aba em Settings/Cliente:
- `target_cpa_lead` (R$)
- `target_cpa_purchase` (R$)
- `cpa_alert_multiplier` (default 1.5x)
- `budget_alert_threshold_pct` (default 90%)

UI: cards horizontais com cor por severidade (amarelo/laranja/vermelho), contador, drill-down ao clicar (abre lista das campanhas afetadas).

---

## 2. Mini-dashboard agregado por cliente

Linha por cliente com KPIs principais (últimos 7d, alternável):
Investimento • Resultados (métrica primária) • CPA • ROAS • CTR • Frequência • # alertas.

Linha expansível mostra top 5 campanhas, gráfico sparkline de gasto vs resultados, e botões rápidos: **Pausar / Ativar / Ajustar budget** (já existe `meta-ads-action`).

---

## 3. Sugestões de otimização (sem aplicar)

Edge function `meta-optimization-suggestions` roda heurísticas + Lovable AI sobre snapshot do cliente:

Heurísticas determinísticas:
- Frequência > 3 e CTR caindo → sugerir pausar/refresh criativo
- ROAS < 1 nos últimos 3d com gasto > X → sugerir pausar
- Adset com CPA 50% melhor que média → sugerir aumentar budget 20%
- Campanha sem entrega 24h → sugerir revisar

Cada sugestão vira um registro em nova tabela `optimization_suggestions` com:
`client_id, level, object_id, object_name, action (pause|activate|increase_budget|decrease_budget), suggested_value, reason, severity, status (pending|approved|rejected|applied), created_at, applied_at`

UI: aba "Sugestões" com lista; cada item tem **Aprovar** (chama `meta-ads-action`) e **Rejeitar**. Nada é executado sem clique do gestor.

---

## 4. Chat IA contextual

Edge function `gestor-chat` (streaming SSE, Lovable AI `google/gemini-3-flash-preview`).

Contexto montado server-side a cada pergunta:
- cliente atual + ad accounts
- snapshot agregado (gasto, resultados, CPA, ROAS por campanha — top 30)
- públicos/segmentações dos adsets ativos
- top 10 criativos com métricas
- alertas ativos

Permite perguntas como: "Qual criativo está com pior CPA esta semana?", "Compare a performance de público lookalike vs interesse", "Quais campanhas estão com fadiga?".

Widget flutuante reutilizável (similar ao `FunnelChatWidget` existente).

---

## 5. Criação de campanhas via prompt (rascunho → publicar)

Fluxo:

1. Gestor abre dialog "Nova campanha por IA", escolhe cliente + ad account, escreve prompt em linguagem natural ("Campanha de conversão para venda do curso X, R$100/dia, público lookalike 1% de compradores, 3 criativos com copy focado em urgência").
2. Edge function `campaign-draft-ai` chama Lovable AI com **tool calling** para extrair JSON estruturado:
   ```
   { campaign: {name, objective, special_ad_categories},
     adsets: [{name, daily_budget, optimization_goal, billing_event, targeting, schedule}],
     ads: [{name, creative: {title, body, cta, link, image_prompt}}] }
   ```
3. Tela de **preview/edição** mostra a estrutura; gestor revisa, ajusta campos, regenera criativos individuais.
4. Botão **Publicar como PAUSADA** chama nova edge function `meta-campaign-create` que faz POST nos endpoints `/act_<id>/campaigns`, `/act_<id>/adsets`, `/act_<id>/ads` com `status=PAUSED`. Requer `ads_management` no token.
5. Imagens dos criativos são geradas via tool `imagegen` (prompt → upload para `/act_<id>/adimages`).

Tabela `campaign_drafts` persiste rascunhos enquanto o gestor edita.

---

## 6. Banco de dados (migrações)

```sql
-- Thresholds por cliente
alter table clients add column target_cpa_lead numeric default 0;
alter table clients add column target_cpa_purchase numeric default 0;
alter table clients add column cpa_alert_multiplier numeric default 1.5;
alter table clients add column budget_alert_threshold_pct numeric default 90;

-- Sugestões
create table optimization_suggestions (
  id uuid pk, client_id uuid, level text, object_id text, object_name text,
  action text, suggested_value numeric, reason text, severity text,
  status text default 'pending', created_at, applied_at, approved_by uuid
);

-- Rascunhos de campanha
create table campaign_drafts (
  id uuid pk, client_id uuid, ad_account_id text,
  prompt text, structure jsonb, status text default 'draft',
  meta_campaign_id text, created_by uuid, created_at, updated_at
);
```

RLS: admin/editor full; client read-only do que é seu.

---

## 7. Estrutura de arquivos

**Novas edge functions:**
- `supabase/functions/meta-account-status/index.ts` — checa status de cada ad account
- `supabase/functions/meta-optimization-suggestions/index.ts` — gera sugestões (heurística + IA)
- `supabase/functions/gestor-chat/index.ts` — chat streaming com contexto
- `supabase/functions/campaign-draft-ai/index.ts` — prompt → estrutura JSON via tool calling
- `supabase/functions/meta-campaign-create/index.ts` — publica rascunho como PAUSADA na Meta

**Novos componentes:**
- `src/components/gestor/AlertsPanel.tsx`
- `src/components/gestor/ClientKpiRow.tsx`
- `src/components/gestor/SuggestionsList.tsx`
- `src/components/gestor/GestorChatWidget.tsx`
- `src/components/gestor/NewCampaignAIDialog.tsx`
- `src/components/gestor/CampaignDraftEditor.tsx`
- `src/components/clients/AlertThresholdsForm.tsx` (na config do cliente)

**Hooks:**
- `useClientAlerts`, `useOptimizationSuggestions`, `useCampaignDrafts`

**Refatoração:**
- `src/pages/GestorView.tsx` — passa a ter abas: Cockpit (alertas+KPIs) | Sugestões | Campanhas | Chat | Nova Campanha

---

## 8. Ordem de execução

1. Migrações (thresholds + 2 tabelas novas) → **aguarda aprovação**
2. Edge functions de leitura: `meta-account-status` + `meta-optimization-suggestions`
3. UI cockpit: `AlertsPanel` + `ClientKpiRow` + integração no `GestorView`
4. Tela de Sugestões + aprovar/rejeitar (reusa `meta-ads-action`)
5. `gestor-chat` + `GestorChatWidget`
6. `campaign-draft-ai` + `meta-campaign-create` + dialog/editor
7. Form de thresholds no cliente

---

## Observações técnicas

- Criação real de campanha exige **token Meta com `ads_management`** — se faltar, mostro o aviso `needsScope` que já existe no `meta-ads-action`.
- Geração de imagens dos criativos usa Gemini image preview via Lovable AI (cobra créditos do workspace, não tokens do gestor).
- Cache `meta_ads_cache` (2h) é reutilizado para alimentar alertas e contexto do chat — sem chamadas extras à Meta.
- Chat e sugestões são streaming/lazy: nada roda em background; só quando o gestor abre a aba.

Após aprovação do plano, começo pela migração de banco.
