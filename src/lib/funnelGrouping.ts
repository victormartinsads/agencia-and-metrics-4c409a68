import { Campaign } from "@/data/mockMetaData";

/**
 * Mapa unificado de funis. Cada entrada tenta casar o nome da campanha
 * com um regex; se casar, a campanha é agrupada sob aquele rótulo.
 */
export const FUNNEL_MAP: { regex: RegExp; label: string }[] = [
  { regex: /CAPTACAO_?(?:DE_)?SEGUIDORES|CAPTAÇÃO_?(?:DE_)?SEGUIDORES/i, label: "Captação de Seguidores" },
  { regex: /CORREDOR_?JAPONES|CORREDOR_?JAPONÊS/i, label: "Corredor Japonês" },
  { regex: /CALL_?MENSAGEM_?IG/i, label: "Call de Vendas | Mensagens" },
  { regex: /CALL_?PC/i, label: "Call de Vendas | Página de Captura" },
  { regex: /MINI_?TREINAMENTO_?PC/i, label: "Mini Treinamento | Página de Captura" },
  { regex: /ISCA_?PC/i, label: "Isca | Página de Captura" },
  { regex: /SERVICOS_?MENSAGENS_?WPP|SERVIÇOS_?MENSAGENS_?WPP/i, label: "Serviços | Mensagens" },
  { regex: /MEDIUM_?TICKET_?PV/i, label: "Medium Ticket | Página de Vendas" },
  { regex: /LOW_?TICKET_?PV/i, label: "Low Ticket | Página de Vendas" },
  { regex: /FORMS_?NATIVO/i, label: "Formulário Nativo" },
  { regex: /IMERSÃO_?PAGA|IMERSAO_?PAGA/i, label: "Imersão Paga" },
  { regex: /WORKSHOP/i, label: "Workshop" },
];

export function getFunnelLabelOrNull(campaignName: string): string | null {
  for (const { regex, label } of FUNNEL_MAP) {
    if (regex.test(campaignName)) return label;
  }
  return null;
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
