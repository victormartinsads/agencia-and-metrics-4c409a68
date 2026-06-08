import { FunnelCampaign, FunnelMetrics } from "../hooks/useFunnelAnalysis";
import { TrendingUp, Sparkles, Brain, GitBranch, AlertTriangle, Target, Activity } from "lucide-react";

export interface InsightCategory {
  title: string;
  icon: typeof TrendingUp;
  content: string;
}

export class ExpertEngine {
  public static generateInsights(campaigns: FunnelCampaign[], metrics: FunnelMetrics): InsightCategory[] {
    const results: InsightCategory[] = [];

    // 1. Diagnóstico Geral do Funil
    const generalDiagnosis = this.buildGeneralDiagnosis(campaigns, metrics);
    results.push({
      title: "Diagnóstico Geral do Funil",
      icon: Brain,
      content: generalDiagnosis,
    });

    // 2. Análise Específica por Campanha
    const sortedCampaigns = [...campaigns].sort((a, b) => b.spend - a.spend); // Foca nas de maior gasto primeiro
    for (const campaign of sortedCampaigns) {
      if (campaign.spend > 0) {
        const campDiagnosis = this.buildCampaignDiagnosis(campaign);
        results.push({
          title: `Otimizações: ${campaign.name}`,
          icon: GitBranch,
          content: campDiagnosis,
        });
      }
    }

    return results;
  }

  private static buildGeneralDiagnosis(campaigns: FunnelCampaign[], metrics: FunnelMetrics): string {
    let md = `**MAPA DO FUNIL E SAÚDE GERAL**\n\n`;

    const lpViewRate = metrics.ctrRate > 0 ? (metrics.lpRate) : 0; 
    
    md += `📊 **Camada 1: Tráfego e Landing Page**\n`;
    if (metrics.ctrRate < 1) {
      md += `- ⚠️ **CTR Crítico (${metrics.ctrRate.toFixed(2)}%)**: Seus criativos não estão parando o scroll ou não conectam com o público. O custo do tráfego está alto por conta disso.\n`;
    } else if (metrics.ctrRate > 2) {
      md += `- ✅ **CTR Saudável (${metrics.ctrRate.toFixed(2)}%)**: Bom alinhamento entre promessa do criativo e público-alvo.\n`;
    } else {
      md += `- ℹ️ **CTR Médio (${metrics.ctrRate.toFixed(2)}%)**: Dá para otimizar os criativos, mas não é o gargalo principal.\n`;
    }

    md += `\n📊 **Camada 2: Retenção da Página**\n`;
    if (metrics.lpRate < 85 && metrics.lpRate > 0) {
      md += `- ⚠️ **Perda de Cliques (${metrics.lpRate.toFixed(1)}% de retenção)**: O ideal é >85%. Você está perdendo ${(100 - metrics.lpRate).toFixed(1)}% das pessoas que clicam antes delas verem a página. Verifique a velocidade de carregamento (PageSpeed) e a otimização Mobile!\n`;
    } else if (metrics.lpRate >= 85) {
      md += `- ✅ **Retenção de Clique Excelente (${metrics.lpRate.toFixed(1)}%)**: A página carrega rápido e não perde tráfego no caminho.\n`;
    }

    md += `\n📊 **Camada 4: Checkout e Vendas**\n`;
    if (metrics.checkoutRate < 15 && metrics.checkoutRate > 0) {
      md += `- ⚠️ **Fuga no Checkout (${metrics.checkoutRate.toFixed(1)}%)**: O benchmark para checkout é de >15% (Bom) a >25% (Ótimo). Muito acesso, mas pouca compra. Problemas possíveis: falta de quebra de objeções, ausência de prova social no checkout, ou problemas de parcelamento/juros.\n`;
    } else if (metrics.checkoutRate >= 15) {
      md += `- ✅ **Conversão de Checkout Saudável (${metrics.checkoutRate.toFixed(1)}%)**: Seu checkout converte dentro da métrica de mercado.\n`;
    }

    md += `\n**💸 DIAGNÓSTICO FINANCEIRO:**\n`;
    if (metrics.roas < 1 && metrics.roas > 0) {
      md += `🚨 **ROAS NEGATIVO (${metrics.roas.toFixed(2)}x)**: Você está perdendo dinheiro na aquisição. Pause imediatamente o que não performa e isole o gargalo (CTR ruim ou LP que não converte).\n`;
    } else if (metrics.roas >= 1 && metrics.roas < 2.5) {
      md += `⚠️ **ROAS PERIGOSO (${metrics.roas.toFixed(2)}x)**: A operação se paga, mas a margem é apertada. Precisamos escalar com cautela e focar na taxa de conversão do checkout para aumentar lucro.\n`;
    } else if (metrics.roas >= 2.5) {
      md += `🚀 **ROAS SAUDÁVEL (${metrics.roas.toFixed(2)}x)**: Cenário propício para escala agressiva (20% de aumento a cada 48h nas campanhas campeãs).\n`;
    }

    return md;
  }

  private static buildCampaignDiagnosis(campaign: FunnelCampaign): string {
    const nameLower = campaign.name.toLowerCase();
    
    // Dedução de objetivo
    let isTopo = nameLower.includes('topo') || nameLower.includes('distribuição') || nameLower.includes('engajamento') || nameLower.includes('seguidores');
    let isLeads = nameLower.includes('lead') || nameLower.includes('captura') || nameLower.includes('cpl');
    let isVendas = nameLower.includes('venda') || nameLower.includes('conversão') || nameLower.includes('fundo') || nameLower.includes('remarketing');
    
    if (!isTopo && !isLeads && !isVendas) {
      isVendas = true; // Fallback para cobrança mais severa
    }

    let md = ``;
    
    if (isTopo) {
      md += `**Objetivo Deduzido**: Topo de Funil / Distribuição\n\n`;
      md += `Nesta etapa o foco é gerar consciência e tráfego barato. Não vou te cobrar ROAS aqui, e sim qualidade de atenção (CPM e CTR).\n\n`;
      
      if (campaign.ctr < 1) {
        md += `⚠️ **ALERTA DE CRIATIVO**: O CTR de ${campaign.ctr.toFixed(2)}% está péssimo. Seus criativos de atração estão sendo ignorados.\n`;
        md += `🎯 **AÇÃO IMEDIATA**: Pause os piores e suba formatos diferentes (reels dinâmicos, ganchos visuais fortes nos primeiros 3s).\n`;
      } else {
        md += `✅ **TRÁFEGO SAUDÁVEL**: CTR de ${campaign.ctr.toFixed(2)}%. Os criativos estão chamando atenção.\n`;
        if (campaign.frequency > 3) {
          md += `⚠️ Mas cuidado: Frequência de ${campaign.frequency.toFixed(1)}. O público está começando a saturar. Fique de olho.\n`;
        }
      }
    } else if (isLeads) {
      md += `**Objetivo Deduzido**: Captação de Leads\n\n`;
      md += `O jogo aqui é Custo por Lead (CPL) e Taxa de Conversão da Landing Page.\n\n`;
      
      const convRate = campaign.clicks > 0 ? (campaign.actionBreakdown?.['lead'] || 0) / campaign.clicks * 100 : 0;
      
      if (convRate < 30 && convRate > 0) {
        md += `⚠️ **GARGALO NA PÁGINA**: A conversão da LP está em ${convRate.toFixed(1)}%. O benchmark mínimo para captação é >30%. Tem gente clicando mas não se inscrevendo.\n`;
        md += `🎯 **AÇÃO**: Revise a promessa da página. A copy do anúncio está desalinhada com a Headline da página? O formulário é muito longo?\n`;
      } else if (convRate >= 30) {
        md += `🚀 **CAPTURA EXCELENTE**: Conversão da LP em ${convRate.toFixed(1)}%. Pode escalar a verba desta campanha (aumento de 20% a 30% a cada 2 dias) pois o funil de entrada está azeitado.\n`;
      } else {
        md += `⚠️ **SEM DADOS DE LEADS**: Não localizei as métricas de conversão de lead nesta campanha.\n`;
      }
      
    } else {
      md += `**Objetivo Deduzido**: Conversão e Vendas (Fundo de Funil)\n\n`;
      md += `A regra aqui é matemática fria: Retorno sobre o investimento (ROAS) e Custo por Aquisição (CPA).\n\n`;
      
      if (campaign.roas > 2.5) {
        md += `🚀 **MÁQUINA DE LUCRO**: ROAS de ${campaign.roas.toFixed(2)}x.\n`;
        md += `🎯 **AÇÃO**: ESCALAR! Aumente o orçamento em 20% a 30%. O público está comprador e a oferta conectou. Aproveite a janela.\n`;
      } else if (campaign.roas >= 1 && campaign.roas <= 2.5) {
        md += `⚠️ **ZONA DE RISCO MÉDIO**: ROAS de ${campaign.roas.toFixed(2)}x.\n`;
        md += `A campanha se paga, mas a margem está estreita. \n`;
        const checkoutRate = campaign.landingPageViews > 0 ? (campaign.initiateCheckout / campaign.landingPageViews * 100) : 0;
        if (checkoutRate < 5) {
          md += `👉 **Gargalo**: Pouca gente está chegando no checkout (${checkoutRate.toFixed(1)}% apenas). A sua página de vendas pode não estar quebrando as objeções corretamente.\n`;
        } else {
          md += `👉 **Gargalo**: Tente testar novos públicos similares (lookalike 1%) para buscar CPAs mais baratos sem mexer na oferta.\n`;
        }
      } else {
        md += `🚨 **DESASTRE IMINENTE**: ROAS Negativo (${campaign.roas.toFixed(2)}x).\n`;
        md += `🎯 **AÇÃO IMEDIATA**: PAUSAR ou reduzir drasticamente o orçamento. \n`;
        if (campaign.ctr < 1) {
          md += `O seu CTR (${campaign.ctr.toFixed(2)}%) mostra que a oferta nem sequer está atraindo clique.\n`;
        } else {
          md += `A oferta atrai clique (CTR: ${campaign.ctr.toFixed(2)}%), mas as pessoas chegam na página e não compram. Refaça a copy de vendas ou reavalie a oferta/preço.\n`;
        }
      }
    }

    return md;
  }
}
