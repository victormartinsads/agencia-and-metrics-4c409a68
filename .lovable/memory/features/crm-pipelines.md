---
name: CRM Pipelines
description: Múltiplos pipelines por organização — webhook de entrada exclusivo, campos por pipeline e webhooks de saída isolados
type: feature
---
- Tabela `pipelines` (organization_id, name, color). Leads, webhook_tokens, lead_custom_field_defs, outbound_webhooks têm `pipeline_id` (nullable).
- Custom fields com pipeline_id NULL = globais; com pipeline_id = exclusivos. Form mostra ambos.
- Estágios compartilhados (status enum), não há kanban por pipeline.
- Outbound: pipeline_id NULL dispara só para leads sem pipeline; pipeline específico só para leads daquele pipeline.
- UI: PipelineSwitcher no header de /crm-app, filtro client-side.
