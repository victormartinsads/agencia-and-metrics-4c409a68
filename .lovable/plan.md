## 1. Sincronização automática das planilhas (1x/dia)

- Habilitar extensões `pg_cron` e `pg_net` no banco.
- Criar uma edge function `sheets-sync-all` que percorre todos os `dashboard_sheet_config` com `spreadsheet_id` configurado e invoca `sheets-sync-v2` para cada `client_id` (em sequência, com tolerância a falhas individuais).
- Agendar via `cron.schedule` para rodar 1x por dia (06:00 UTC ≈ 03:00 BRT) chamando essa função via `net.http_post`.
- Mostrar no painel do cliente o `last_synced_at` e um botão "Sincronizar agora" (já temos o "Atualizar"; vamos garantir o feedback do último sync).

## 2. Painel de configurações por cliente

Hoje toda configuração mora na lista global `/clients`. Vamos centralizar tudo dentro do dashboard de cada cliente.

- Nova rota `/clients/:clientId/settings` com a página `ClientSettings.tsx` em formato de abas:
  - **Geral**: nome, slug, moeda, metas (CPA lead/purchase, multiplicador alerta, % alerta orçamento), abas visíveis.
  - **Meta Ads**: token de acesso, contas de anúncio (até 5), tipos de ação para leads.
  - **Google**: Google Ads Customer ID, GA4 Property ID, status do OAuth (com botão "conectar/desconectar").
  - **Planilhas**: embute o conteúdo atual de `ClientSheetsConfig`.
  - **Webhooks**: embute o conteúdo atual de `ClientWebhooksConfig`.
  - **Usuários do cliente**: gerencia `client_users` (já existe lógica em `useClientUsers`).
  - **CRM**: ativar/desativar CRM do cliente (move o switch atual da lista global para cá).
- Trocar o botão "Configurações" no header de `ClientDashboard` para apontar para `/clients/:clientId/settings` (hoje vai pra lista global `/clients`).
- A lista `/clients` continua existindo só para criar/excluir clientes e listar; a edição completa passa a ser feita no painel individual.

## 3. CRM dos clientes acessível a todos os membros

Hoje o `OrgSwitcher` lista apenas organizações em que o usuário é membro de fato (`organization_members`). Admin/editor já têm policy de leitura nos leads e orgs vinculados a clientes, mas não aparecem no seletor.

- Atualizar `useMyOrganizations` para, quando o usuário for `admin` ou `editor` da plataforma, retornar também todas as organizações com `client_id` preenchido (orgs de clientes), unificadas com as orgs em que ele já é membro.
- Garantir que admin/editor consigam operar (criar leads, mover etapas, criar pipelines, tags, etc.) nessas orgs — adicionar policies "Platform admins manage" para as tabelas que ainda só têm `is_member_of_org` (`pipelines`, `lead_tags`, `lead_custom_field_defs`, `outbound_webhooks`, `webhook_tokens`, `webhook_integrations` se existir) espelhando a policy já existente em `leads`.
- Sem mudança em UX para clientes finais (eles continuam vendo só a org do próprio cliente).

## Notas técnicas

- Migration única para: habilitar `pg_cron`/`pg_net`, criar o cron job (usando `insert` para os dados sensíveis do projeto), e adicionar policies de admin/editor nas tabelas da seção 3.
- A edge function `sheets-sync-all` reusa o serviço atual; nenhum schema novo é necessário.
- O painel de configurações reutiliza componentes/hooks existentes (`VisibleTabsEditor`, `useClientUsers`, `useEnableClientCrm`, conteúdo de `ClientSheetsConfig`/`ClientWebhooksConfig`) para evitar duplicação.
