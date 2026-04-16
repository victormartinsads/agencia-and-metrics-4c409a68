import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Sparkles, Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSavedInsights, useAddInsight, useUpdateInsight, useDeleteInsight } from "@/hooks/useSavedInsights";
import type { ComoEstamosMetrics, ClassifiedCampaign } from "@/hooks/useComoEstamos";
import { toast } from "sonner";

interface Props {
  clientId: string;
  datePreset: string;
  metrics: ComoEstamosMetrics;
  prevMetrics?: ComoEstamosMetrics;
  classified: ClassifiedCampaign[];
  alerts: string[];
  showAI: boolean;
}

export function EditableInsights({ clientId, datePreset, metrics, prevMetrics, classified, alerts, showAI }: Props) {
  const { data: savedInsights = [] } = useSavedInsights(clientId, datePreset);
  const addInsight = useAddInsight();
  const updateInsight = useUpdateInsight();
  const deleteInsight = useDeleteInsight();

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newContent, setNewContent] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Analise estes dados de campanhas de Meta Ads e gere insights estratégicos em português.

MÉTRICAS ATUAIS:
- Investimento: R$ ${metrics.totalSpend.toFixed(2)}
- Resultados: ${metrics.totalResults}
- CTR: ${metrics.ctr.toFixed(2)}%
- CPA: R$ ${metrics.cpa.toFixed(2)}
- CPM: R$ ${metrics.cpm.toFixed(2)}
- Taxa de conversão: ${metrics.conversionRate.toFixed(2)}%

${prevMetrics ? `COMPARAÇÃO:
- Investimento anterior: R$ ${prevMetrics.totalSpend.toFixed(2)}
- CTR anterior: ${prevMetrics.ctr.toFixed(2)}%
- CPA anterior: R$ ${prevMetrics.cpa.toFixed(2)}` : ""}

ALERTAS: ${alerts.join("; ")}

TOP CAMPANHAS:
${classified.slice(0, 10).map(c => `- ${c.name}: R$${c.spend.toFixed(0)}, ${c.conversions} resultados, CTR ${c.ctr}%, CPA R$${c.costPerConversion.toFixed(2)}`).join("\n")}

Gere 3-5 insights curtos e acionáveis, um por linha.`;

      const { data, error } = await supabase.functions.invoke("funnel-insights", {
        body: { prompt, clientId },
      });
      if (error) throw error;
      const text = data?.insights || data?.text || "";
      // Save each line as a separate insight
      const lines = text.split("\n").filter((l: string) => l.trim().length > 5);
      for (const line of lines) {
        await addInsight.mutateAsync({
          client_id: clientId,
          date_preset: datePreset,
          content: line.trim(),
          is_manual: false,
        });
      }
      toast.success("Insights gerados e salvos!");
    } catch {
      toast.error("Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updateInsight.mutateAsync({ id: editingId, content: editContent, clientId, datePreset });
    setEditingId(null);
    toast.success("Insight atualizado");
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    await addInsight.mutateAsync({
      client_id: clientId,
      date_preset: datePreset,
      content: newContent.trim(),
      is_manual: true,
    });
    setNewContent("");
    setShowAddForm(false);
    toast.success("Insight adicionado");
  };

  const handleDelete = async (id: string) => {
    await deleteInsight.mutateAsync({ id, clientId, datePreset });
    toast.success("Insight removido");
  };

  if (!showAI && savedInsights.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" /> Insights
        </h3>
        <div className="flex items-center gap-2">
          {showAI && (
            <Button onClick={generate} disabled={loading} size="sm" className="gap-2 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Gerando..." : "Gerar com IA"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-1 text-xs">
            <Plus className="h-3 w-3" /> Manual
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        {showAddForm && (
          <div className="flex gap-2 mb-3">
            <Textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Escreva um insight..."
              className="text-xs min-h-[60px]"
            />
            <div className="flex flex-col gap-1">
              <Button size="sm" onClick={handleAdd} className="text-xs"><Save className="h-3 w-3" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs"><X className="h-3 w-3" /></Button>
            </div>
          </div>
        )}

        {savedInsights.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum insight salvo. Gere com IA ou adicione manualmente.
          </p>
        )}

        {savedInsights.map(insight => (
          <div key={insight.id} className="flex items-start gap-2 group bg-secondary/20 rounded-lg p-3">
            {editingId === insight.id ? (
              <div className="flex-1 flex gap-2">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="text-xs min-h-[50px] flex-1"
                />
                <div className="flex flex-col gap-1">
                  <Button size="sm" onClick={handleSaveEdit} className="text-xs"><Save className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="text-xs"><X className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm text-card-foreground whitespace-pre-wrap">{insight.content}</p>
                  {insight.is_manual && (
                    <span className="text-[9px] text-yellow-400 bg-yellow-500/10 px-1.5 rounded mt-1 inline-block">manual</span>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(insight.id, insight.content)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleDelete(insight.id)} className="text-destructive hover:text-destructive/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
