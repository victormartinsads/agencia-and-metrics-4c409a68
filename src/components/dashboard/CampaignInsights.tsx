import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Lightbulb, CheckCircle2, XCircle } from "lucide-react";

interface Insight {
  type: "alert" | "improvement" | "positive";
  title: string;
  description: string;
}

function generateInsights(campaigns: Campaign[]): Insight[] {
  const insights: Insight[] = [];
  const active = campaigns.filter((c) => c.status === "active" && c.spend > 0);

  if (active.length === 0) return [{ type: "alert", title: "Sem campanhas ativas", description: "Nenhuma campanha ativa com investimento no período selecionado." }];

  // Total metrics
  const totalSpend = active.reduce((s, c) => s + c.spend, 0);

  for (const c of active) {
    const spendShare = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0;

    // High CPC alert
    const avgCpc = active.reduce((s, x) => s + x.cpc, 0) / active.length;
    if (c.cpc > avgCpc * 1.5 && c.cpc > 1) {
      insights.push({
        type: "alert",
        title: `CPC alto em "${c.name}"`,
        description: `CPC de R$ ${c.cpc.toFixed(2)} está ${((c.cpc / avgCpc - 1) * 100).toFixed(0)}% acima da média (R$ ${avgCpc.toFixed(2)}). Considere revisar segmentação ou criativos.`,
      });
    }

    // Low CTR alert
    if (c.ctr < 1.0 && c.impressions > 5000) {
      insights.push({
        type: "alert",
        title: `CTR baixo em "${c.name}"`,
        description: `CTR de ${c.ctr}% está abaixo de 1%. Teste novas copies, imagens e CTAs para melhorar o engajamento.`,
      });
    }

    // High frequency alert
    if (c.frequency > 3) {
      insights.push({
        type: "alert",
        title: `Frequência alta em "${c.name}"`,
        description: `Frequência de ${c.frequency}x indica fadiga de anúncio. Renove criativos ou amplie o público.`,
      });
    }

    // Budget concentration warning
    if (spendShare > 50 && active.length > 2) {
      insights.push({
        type: "improvement",
        title: `Concentração de orçamento em "${c.name}"`,
        description: `${spendShare.toFixed(0)}% do investimento total está nesta campanha. Diversifique para reduzir riscos.`,
      });
    }

    // Good ROAS
    if (c.roas > 5) {
      insights.push({
        type: "positive",
        title: `Excelente ROAS em "${c.name}"`,
        description: `ROAS de ${c.roas}x — considere escalar o investimento nesta campanha mantendo a mesma segmentação.`,
      });
    }

    // Good CTR
    if (c.ctr > 3 && c.impressions > 10000) {
      insights.push({
        type: "positive",
        title: `CTR forte em "${c.name}"`,
        description: `CTR de ${c.ctr}% indica criativos bem alinhados com o público. Considere replicar os formatos.`,
      });
    }

    // Zero conversions warning
    if (c.conversions === 0 && c.spend > 50) {
      insights.push({
        type: "alert",
        title: `Sem conversões em "${c.name}"`,
        description: `R$ ${c.spend.toFixed(2)} investidos sem resultado. Avalie a landing page, pixel e configuração de eventos.`,
      });
    }

    // High CPA
    if (c.costPerConversion > 0) {
      const avgCpa = active.filter((x) => x.costPerConversion > 0).reduce((s, x) => s + x.costPerConversion, 0) / (active.filter((x) => x.costPerConversion > 0).length || 1);
      if (c.costPerConversion > avgCpa * 2 && c.conversions > 0) {
        insights.push({
          type: "improvement",
          title: `CPA elevado em "${c.name}"`,
          description: `CPA de R$ ${c.costPerConversion.toFixed(2)} é ${((c.costPerConversion / avgCpa - 1) * 100).toFixed(0)}% acima da média. Otimize públicos e lance.`,
        });
      }
    }
  }

  // General positive
  if (insights.filter((i) => i.type === "alert").length === 0) {
    insights.push({
      type: "positive",
      title: "Campanhas saudáveis",
      description: "Nenhum alerta crítico encontrado. As métricas estão dentro dos parâmetros normais.",
    });
  }

  return insights.slice(0, 8);
}

const iconMap = {
  alert: { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  improvement: { icon: Lightbulb, bg: "bg-meta-orange/10", text: "text-meta-orange", border: "border-meta-orange/20" },
  positive: { icon: CheckCircle2, bg: "bg-meta-green/10", text: "text-meta-green", border: "border-meta-green/20" },
};

interface Props {
  campaigns: Campaign[];
}

export function CampaignInsights({ campaigns }: Props) {
  const insights = generateInsights(campaigns);

  const alerts = insights.filter((i) => i.type === "alert");
  const improvements = insights.filter((i) => i.type === "improvement");
  const positives = insights.filter((i) => i.type === "positive");

  const sections = [
    { title: "Alertas", items: alerts, type: "alert" as const },
    { title: "Melhorias Sugeridas", items: improvements, type: "improvement" as const },
    { title: "Pontos Positivos", items: positives, type: "positive" as const },
  ].filter((s) => s.items.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Insights & Alertas</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Análise automática baseada nas métricas das campanhas
        </p>
      </div>
      <div className="p-5 space-y-5">
        {sections.map((section) => {
          const style = iconMap[section.type];
          return (
            <div key={section.title} className="space-y-3">
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.items.map((insight, idx) => {
                  const Icon = style.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-lg border ${style.border} ${style.bg} p-3 flex items-start gap-3`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
