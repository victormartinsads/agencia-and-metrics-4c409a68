import { Campaign } from "@/data/mockMetaData";

/**
 * Mapa unificado de funis baseado no prefixo F1..F15 no início do nome
 * da campanha. Aceita variações: F1, [F1], F1_, [F1]_ etc.
 */
export const FUNNEL_DEFINITIONS: { code: string; label: string }[] = [
  { code: "F1", label: "F1 - Captação de Seguidores" },
  { code: "F2", label: "F2 - Corredor Japonês" },
  { code: "F3", label: "F3 - Call de Vendas | Mensagens" },
  { code: "F4", label: "F4 - Call de Vendas | Página de Captura" },
  { code: "F5", label: "F5 - Mini Treinamento | Página de Captura" },
  { code: "F6", label: "F6 - Isca | Página de Captura" },
  { code: "F7", label: "F7 - Serviços | Mensagens" },
  { code: "F8", label: "F8 - Medium Ticket | Página de Vendas" },
  { code: "F9", label: "F9 - Low Ticket | Página de Vendas" },
  { code: "F10", label: "F10 - Formulário Nativo" },
  { code: "F11", label: "F11 - Workshop Pago" },
  { code: "F12", label: "F12 - Workshop Gratuito" },
  { code: "F13", label: "F13 - Workshop Presencial" },
  { code: "F14", label: "F14 - Comunidade" },
  { code: "F15", label: "F15 - Engajamento / Interação" },
];

// Backwards-compat alias for any legacy import
export const FUNNEL_MAP = FUNNEL_DEFINITIONS.map((f) => ({
  regex: new RegExp(`^\\[?${f.code}\\]?[_\\s\\-]`, "i"),
  label: f.label,
}));

/** Extrai o código F1..F15 do início do nome da campanha. */
export function extractFunnelCode(campaignName: string): string | null {
  const m = campaignName.match(/^\s*\[?\s*(F\d{1,2})\s*\]?[\s_\-:]/i);
  if (!m) return null;
  const code = m[1].toUpperCase();
  return FUNNEL_DEFINITIONS.find((f) => f.code === code)?.code || null;
}

export function getFunnelLabelOrNull(campaignName: string): string | null {
  const code = extractFunnelCode(campaignName);
  if (!code) return null;
  return FUNNEL_DEFINITIONS.find((f) => f.code === code)?.label || null;
}

export interface FunnelGroup {
  /** Rótulo do funil (ex: "Captação de Seguidores") ou nome da campanha solta */
  key: string;
  /** True quando este grupo representa um funil identificado (várias campanhas).
   *  False quando é uma campanha solta sem funil mapeado. */
  isFunnel: boolean;
  campaigns: Campaign[];
}

/**
 * Agrupa campanhas por funil (quando o nome casa com FUNNEL_MAP) ou
 * mantém a campanha como grupo individual (quando não casa).
 * Usado pelo "Diagnóstico Semanal" do Como Estamos.
 */
export function groupCampaignsByFunnel(campaigns: Campaign[]): FunnelGroup[] {
  const map = new Map<string, FunnelGroup>();

  for (const c of campaigns) {
    const funnel = getFunnelLabelOrNull(c.name);
    if (funnel) {
      const existing = map.get(funnel);
      if (existing) {
        existing.campaigns.push(c);
      } else {
        map.set(funnel, { key: funnel, isFunnel: true, campaigns: [c] });
      }
    } else {
      // campanha solta — usa próprio id para evitar colisão de nomes idênticos
      const key = `__campaign__${c.id}`;
      map.set(key, { key: c.name, isFunnel: false, campaigns: [c] });
    }
  }

  // Ordena: funis com mais gasto primeiro, depois campanhas soltas por gasto
  return Array.from(map.values()).sort((a, b) => {
    const sa = a.campaigns.reduce((s, c) => s + c.spend, 0);
    const sb = b.campaigns.reduce((s, c) => s + c.spend, 0);
    return sb - sa;
  });
}
