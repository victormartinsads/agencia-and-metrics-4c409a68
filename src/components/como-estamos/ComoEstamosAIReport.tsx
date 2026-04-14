import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ComoEstamosMetrics, ClassifiedCampaign } from "@/hooks/useComoEstamos";

interface Props {
  clientId: string;
  metrics: ComoEstamosMetrics;
  prevMetrics?: ComoEstamosMetrics;
  classified: ClassifiedCampaign[];
  alerts: string[];
  datePreset: string;
}

export function ComoEstamosAIReport({ clientId, metrics, prevMetrics, classified, alerts, datePreset }: Props) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      // Fetch weekly notes
      const { data: notes } = await supabase
        .from("weekly_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("date_preset", datePreset)
        .maybeSingle();

      const prompt = `Gere uma ANÁLISE SEMANAL DE PERFORMANCE completa em português para apresentação ao cliente.

DADOS:
- Investimento: R$ ${metrics.totalSpend.toFixed(2)}
- Resultados: ${metrics.totalResults}
- Leads: ${metrics.totalLeads}
- Conversas: ${metrics.totalConversations}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPA: R$ ${metrics.cpa.toFixed(2)}
- CPM: R$ ${metrics.cpm.toFixed(2)}
- ROAS: ${metrics.roas.toFixed(2)}x
- Aproveitamento: ${metrics.trafficUtilization.toFixed(1)}%

${prevMetrics ? `PERÍODO ANTERIOR: Invest R$${prevMetrics.totalSpend.toFixed(2)}, ${prevMetrics.totalResults} resultados, CTR ${prevMetrics.ctr.toFixed(2)}%` : ""}

ALERTAS: ${alerts.join("; ") || "Nenhum"}

CAMPANHAS PARA ESCALAR: ${classified.filter(c => c.classification === "escalar").map(c => c.name).join(", ") || "Nenhuma"}
CAMPANHAS PARA REVISAR: ${classified.filter(c => c.classification === "revisar").map(c => c.name).join(", ") || "Nenhuma"}

${notes?.what_we_did ? `O QUE FOI FEITO: ${notes.what_we_did}` : ""}
${notes?.next_actions ? `PRÓXIMAS AÇÕES PLANEJADAS: ${notes.next_actions}` : ""}

Estruture o relatório com:
1. 📊 Resumo Geral da Performance
2. ✅ O que melhor performou
3. ⚠️ Principais problemas
4. 🚀 Oportunidades de escala
5. 📋 Próximos passos recomendados

Formato: linguagem clara e profissional, com emojis e bullet points.`;

      const { data, error } = await supabase.functions.invoke("funnel-insights", {
        body: { prompt, clientId },
      });

      if (error) throw error;
      setReport(data?.insights || data?.text || "Não foi possível gerar o relatório.");
    } catch (e) {
      setReport("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Análise Semanal de Performance
        </h3>
        <Button onClick={generate} disabled={loading} size="sm" className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Gerando..." : "Gerar Relatório"}
        </Button>
      </div>
      {report && (
        <div className="rounded-xl border border-primary/20 bg-card p-6">
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm text-card-foreground">
            {report}
          </div>
        </div>
      )}
    </motion.div>
  );
}
