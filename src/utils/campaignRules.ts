import { CreativeData, Funnel, AdSetData } from '../data/mockCampaigns';

export type DiagnosticLevel = 'success' | 'warning' | 'danger' | 'info';

export interface CreativeDiagnostic {
  creativeId: string;
  ruleName: string;
  level: DiagnosticLevel;
  metricFailing?: string;
  currentCost?: number;
  goalCost?: number;
  message: string;
  suggestion: string;
}

export interface AdSetDiagnostic {
  adSetId: string;
  ruleName: string;
  level: DiagnosticLevel;
  metricFailing?: string;
  currentValue?: number;
  goalValue?: number;
  message: string;
  suggestion: string;
}

export function analyzeAdSets(adSets: AdSetData[], funnel: Funnel): AdSetDiagnostic[] {
  const diagnostics: AdSetDiagnostic[] = [];
  const goals = funnel.goals;

  adSets.forEach(adSet => {
    if (adSet.status !== 'active') return;
    const isSpending = adSet.spent > 0;
    if (!isSpending) return;

    // 1. Fatigue Analysis (CPM & Frequency)
    if (adSet.frequencyWeekly > 3 && adSet.cpm > 30) {
      diagnostics.push({
        adSetId: adSet.id,
        ruleName: 'Fadiga de Público',
        level: 'warning',
        metricFailing: 'Frequência',
        currentValue: adSet.frequencyWeekly,
        message: `Público saturado. Frequência de ${adSet.frequencyWeekly}x na semana com CPM alto (R$ ${adSet.cpm}).`,
        suggestion: 'Renovar o público. Testar novos lookalikes ou interesses amplos.'
      });
    }

    // 2. Scale Ready (Vertical / Horizontal)
    if (goals.maxCPA > 0 && adSet.purchases > 0) {
      const cpa = adSet.spent / adSet.purchases;
      if (cpa <= goals.maxCPA * 0.8) { // CPA is 20% cheaper than goal
        diagnostics.push({
          adSetId: adSet.id,
          ruleName: 'Oportunidade de Escala',
          level: 'success',
          metricFailing: 'CPA',
          currentValue: cpa,
          goalValue: goals.maxCPA,
          message: `CPA de R$ ${cpa.toFixed(2)} está excelente (Meta: R$ ${goals.maxCPA}).`,
          suggestion: 'Aumentar orçamento do Conjunto em 20% ou criar Lookalike deste público.'
        });
      }
    } else if (goals.maxCPL > 0 && goals.maxCPA === 0 && adSet.leads > 0) {
      // For funnel with no CPA goal but has CPL goal
      const cpl = adSet.spent / adSet.leads;
      if (cpl <= goals.maxCPL * 0.8) {
        diagnostics.push({
          adSetId: adSet.id,
          ruleName: 'Oportunidade de Escala',
          level: 'success',
          metricFailing: 'CPL',
          currentValue: cpl,
          goalValue: goals.maxCPL,
          message: `CPL de R$ ${cpl.toFixed(2)} está excelente (Meta: R$ ${goals.maxCPL}).`,
          suggestion: 'Aumentar orçamento do Conjunto em 20%.'
        });
      }
    }

    // 3. AdSet Bleeding (Sangramento do Conjunto)
    if (goals.maxCPA > 0) {
      if (adSet.spent >= goals.maxCPA * 1.5 && adSet.purchases === 0) {
        diagnostics.push({
          adSetId: adSet.id,
          ruleName: 'Público Desqualificado',
          level: 'danger',
          metricFailing: 'CPA',
          currentValue: adSet.spent,
          goalValue: goals.maxCPA * 1.5,
          message: `O conjunto gastou R$ ${adSet.spent.toFixed(2)} sem nenhuma venda (Margem estourada).`,
          suggestion: 'Pausar o conjunto inteiro. O público não está respondendo à oferta.'
        });
      }
    }
  });

  return diagnostics;
}

export function analyzeCreatives(creatives: CreativeData[], funnel: Funnel): CreativeDiagnostic[] {
  const diagnostics: CreativeDiagnostic[] = [];
  const goals = funnel.goals;

  creatives.forEach(creative => {
    if (creative.status !== 'active') return;
    const isSpending = creative.spent > 0;
    if (!isSpending) return;

    // 1. CPA Analysis (Sales)
    if (goals.maxCPA > 0) {
      if (creative.spent >= goals.maxCPA && creative.purchases === 0) {
        diagnostics.push({
          creativeId: creative.id,
          ruleName: 'Sangramento de CPA',
          level: 'danger',
          metricFailing: 'CPA',
          currentCost: creative.spent,
          goalCost: goals.maxCPA,
          message: `Gastou R$ ${creative.spent.toFixed(2)} (>= meta de R$ ${goals.maxCPA}) sem nenhuma venda.`,
          suggestion: 'Desativar imediatamente. O custo excedeu a margem de lucro do produto.'
        });
      } else if (creative.purchases > 0) {
        const cpa = creative.spent / creative.purchases;
        if (cpa > goals.maxCPA) {
          diagnostics.push({
            creativeId: creative.id,
            ruleName: 'CPA Elevado',
            level: 'danger',
            metricFailing: 'CPA',
            currentCost: cpa,
            goalCost: goals.maxCPA,
            message: `CPA de R$ ${cpa.toFixed(2)} está acima da meta (R$ ${goals.maxCPA}).`,
            suggestion: 'Desativar criativo. Não está sustentando o ROI desejado.'
          });
        }
      }
    }

    // 2. Initiate Checkout Analysis
    if (goals.maxCheckoutCost > 0) {
      if (creative.spent >= goals.maxCheckoutCost && creative.initiateCheckouts === 0) {
        diagnostics.push({
          creativeId: creative.id,
          ruleName: 'Fuga de Checkout',
          level: 'warning',
          metricFailing: 'Custo por Checkout',
          currentCost: creative.spent,
          goalCost: goals.maxCheckoutCost,
          message: `Gastou R$ ${creative.spent.toFixed(2)} sem gerar nenhum Initiate Checkout (Meta: R$ ${goals.maxCheckoutCost}).`,
          suggestion: 'Avaliar desativação ou analisar se a página está com problema no botão de compra.'
        });
      } else if (creative.initiateCheckouts > 0) {
        const icCost = creative.spent / creative.initiateCheckouts;
        if (icCost > goals.maxCheckoutCost) {
          diagnostics.push({
            creativeId: creative.id,
            ruleName: 'Checkout Caro',
            level: 'warning',
            metricFailing: 'Custo por Checkout',
            currentCost: icCost,
            goalCost: goals.maxCheckoutCost,
            message: `Custo por Checkout de R$ ${icCost.toFixed(2)} acima da meta (R$ ${goals.maxCheckoutCost}).`,
            suggestion: 'Desativar criativo. Leads estão chegando com baixa intenção.'
          });
        }
      }
    }

    // 3. CPL Analysis (Leads)
    if (goals.maxCPL > 0) {
      if (creative.spent >= goals.maxCPL && creative.leads === 0) {
        diagnostics.push({
          creativeId: creative.id,
          ruleName: 'Zero Leads',
          level: 'warning',
          metricFailing: 'CPL',
          currentCost: creative.spent,
          goalCost: goals.maxCPL,
          message: `Gastou R$ ${creative.spent.toFixed(2)} sem gerar Leads (Meta: R$ ${goals.maxCPL}).`,
          suggestion: 'Desativar criativo. Não atrai o público certo.'
        });
      } else if (creative.leads > 0) {
        const cpl = creative.spent / creative.leads;
        if (cpl > goals.maxCPL) {
          diagnostics.push({
            creativeId: creative.id,
            ruleName: 'CPL Elevado',
            level: 'warning',
            metricFailing: 'CPL',
            currentCost: cpl,
            goalCost: goals.maxCPL,
            message: `CPL de R$ ${cpl.toFixed(2)} acima da meta (R$ ${goals.maxCPL}).`,
            suggestion: 'Desativar criativo. Aumento no custo de aquisição inicial.'
          });
        }
      }
    }
    
    // 4. Complete Registration Analysis
    if (goals.maxRegistrationCost > 0 && creative.completeRegistrations > 0) {
      const regCost = creative.spent / creative.completeRegistrations;
      if (regCost > goals.maxRegistrationCost) {
        diagnostics.push({
          creativeId: creative.id,
          ruleName: 'Registro Caro',
          level: 'warning',
          metricFailing: 'Custo por Registro',
          currentCost: regCost,
          goalCost: goals.maxRegistrationCost,
          message: `Custo por Registro de R$ ${regCost.toFixed(2)} acima da meta (R$ ${goals.maxRegistrationCost}).`,
          suggestion: 'Desativar. Etapa final do funil muito cara.'
        });
      }
    }

    // 5. Landing Page View Analysis (LPV)
    if (goals.maxLPVCost > 0 && creative.landingPageViews > 0) {
      const lpvCost = creative.spent / creative.landingPageViews;
      if (lpvCost > goals.maxLPVCost) {
        diagnostics.push({
          creativeId: creative.id,
          ruleName: 'LPV Caro',
          level: 'info',
          metricFailing: 'Custo por LPV',
          currentCost: lpvCost,
          goalCost: goals.maxLPVCost,
          message: `Custo por Visita de R$ ${lpvCost.toFixed(2)} acima da meta (R$ ${goals.maxLPVCost}).`,
          suggestion: 'Verifique se a taxa de clique está muito baixa.'
        });
      }
    }

    // 6. Secondary Diagnostics (Connect Rate, Hook Rate)
    const connectRate = creative.linkClicks > 0 ? (creative.landingPageViews / creative.linkClicks) * 100 : 0;
    if (creative.linkClicks > 10 && connectRate < 70) {
      diagnostics.push({
        creativeId: creative.id,
        ruleName: 'Fuga de Carregamento',
        level: 'info',
        message: `Connect Rate de apenas ${connectRate.toFixed(1)}%. Muitos clicaram e não esperaram carregar.`,
        suggestion: 'Pode não ser culpa do criativo, mas fique de olho.'
      });
    }

    if (creative.hookRate > 0 && creative.hookRate < 30) {
      diagnostics.push({
        creativeId: creative.id,
        ruleName: 'Baixa Retenção 3s',
        level: 'info',
        message: `Hook Rate de ${creative.hookRate}% abaixo do ideal.`,
        suggestion: 'Vídeo não retém a atenção inicial.'
      });
    }
  });

  return diagnostics;
}
