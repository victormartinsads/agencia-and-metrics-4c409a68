import { supabase } from "@/integrations/supabase/client";

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'closed' | 'lost';

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
  notes: string | null;
  value: number | null;
  lead_score: number;
  utm_term: string | null;
  utm_content: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fclid: string | null;
  instagram: string | null;
  product: string | null;
  raw_data: Record<string, unknown> | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookToken {
  id: string;
  token: string;
  name: string;
  active: boolean;
  organization_id: string | null;
  created_at: string;
}

const sb = supabase as any;

export const leadsService = {
  async getAll(orgId: string): Promise<Lead[]> {
    const { data, error } = await sb
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Lead[];
  },

  async updateStatus(id: string, status: LeadStatus, oldStatus?: LeadStatus): Promise<void> {
    const { error } = await sb.from('leads').update({ status }).eq('id', id);
    if (error) throw error;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${projectId}.supabase.co/functions/v1/crm-app-dispatch-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id, event_type: status, old_status: oldStatus || null }),
      });
    } catch { /* non-blocking */ }
  },

  async updateNotes(id: string, notes: string) {
    const { error } = await sb.from('leads').update({ notes }).eq('id', id);
    if (error) throw error;
  },
  async updateValue(id: string, value: number | null) {
    const { error } = await sb.from('leads').update({ value }).eq('id', id);
    if (error) throw error;
  },
  async updateProduct(id: string, product: string | null) {
    const { error } = await sb.from('leads').update({ product }).eq('id', id);
    if (error) throw error;
  },
  async updateContact(id: string, data: Partial<Pick<Lead, 'name' | 'email' | 'phone' | 'company' | 'instagram' | 'source'>>) {
    const { error } = await sb.from('leads').update(data).eq('id', id);
    if (error) throw error;
  },
  async delete(id: string) {
    const { error } = await sb.from('leads').delete().eq('id', id);
    if (error) throw error;
  },
};

export const webhookService = {
  async getTokens(orgId: string, pipelineId?: string | null): Promise<WebhookToken[]> {
    let q = sb.from('webhook_tokens').select('*').eq('organization_id', orgId);
    if (pipelineId === null || pipelineId === undefined) q = q.is('pipeline_id', null);
    else q = q.eq('pipeline_id', pipelineId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as WebhookToken[];
  },
  async ensureToken(orgId: string, pipelineId?: string | null, name?: string): Promise<void> {
    let q = sb.from('webhook_tokens').select('id').eq('organization_id', orgId);
    if (pipelineId === null || pipelineId === undefined) q = q.is('pipeline_id', null);
    else q = q.eq('pipeline_id', pipelineId);
    const { data } = await q.limit(1);
    if (data && data.length > 0) return;
    await sb.from('webhook_tokens').insert({
      organization_id: orgId,
      pipeline_id: pipelineId ?? null,
      name: name || (pipelineId ? 'Webhook do pipeline' : 'Webhook Principal'),
    });
  },
  getWebhookUrl(token: string): string {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/crm-app-webhook-leads?token=${token}`;
  },
};

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:       { label: 'Novo',        color: 'hsl(var(--status-new))',       bg: 'hsl(var(--status-new-bg))' },
  contacted: { label: 'Contactado',  color: 'hsl(var(--status-contacted))', bg: 'hsl(var(--status-contacted-bg))' },
  qualified: { label: 'Qualificado', color: 'hsl(var(--status-qualified))', bg: 'hsl(var(--status-qualified-bg))' },
  proposal:  { label: 'Proposta',    color: 'hsl(var(--status-proposal))',  bg: 'hsl(var(--status-proposal-bg))' },
  closed:    { label: 'Fechado',     color: 'hsl(var(--status-closed))',    bg: 'hsl(var(--status-closed-bg))' },
  lost:      { label: 'Perdido',     color: 'hsl(var(--status-lost))',      bg: 'hsl(var(--status-lost-bg))' },
};