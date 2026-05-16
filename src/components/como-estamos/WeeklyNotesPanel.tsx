import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Save, Loader2, ClipboardList, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWeeklyNotes } from "@/hooks/useWeeklyNotes";
import {
  useFunnelPeriodMetrics,
  useSaveFunnelPeriodMetric,
  presetToRange,
} from "@/hooks/useFunnelPeriodMetrics";
import { toast } from "sonner";

interface Props {
  clientId: string;
  datePreset: string;
}

export function WeeklyNotesPanel({ clientId, datePreset }: Props) {
  const { whatWeDid, setWhatWeDid, nextActions, setNextActions, save, saving } = useWeeklyNotes(clientId, datePreset);
  const { data: periodMetrics } = useFunnelPeriodMetrics(clientId, "F1", datePreset);
  const savePeriod = useSaveFunnelPeriodMetric();
  const existing = periodMetrics?.find((m) => m.metric_key === "followers");
  const [followers, setFollowers] = useState<string>("");
  useEffect(() => {
    setFollowers(existing ? String(existing.metric_value) : "");
  }, [existing?.metric_value]);

  const onSaveAll = async () => {
    await save();
    const v = Number(followers);
    if (!Number.isNaN(v)) {
      const { start, end } = presetToRange(datePreset);
      try {
        await savePeriod.mutateAsync({
          client_id: clientId,
          funnel_code: "F1",
          metric_key: "followers",
          metric_label: "Seguidores ganhos",
          metric_value: v,
          period_start: start,
          period_end: end,
          source: "como_estamos",
        });
        if (v > 0) toast.success("Seguidores sincronizados com a Análise de Funis (F1)");
      } catch {
        toast.error("Não foi possível sincronizar seguidores com Análise de Funis");
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold text-card-foreground"
          style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
        >
          📝 Anotações do Gestor
        </h3>
        <Button onClick={onSaveAll} disabled={saving || savePeriod.isPending} size="sm" className="gap-2">
          {saving || savePeriod.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <UserPlus className="h-4 w-4 text-primary" />
          Seguidores ganhos no período
          <span className="text-[10px] font-normal text-muted-foreground/80">(salva em F1 - Captação de Seguidores)</span>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={followers}
          onChange={(e) => setFollowers(e.target.value)}
          placeholder="ex: 250"
          className="max-w-xs"
        />
        <p className="text-[11px] text-muted-foreground/70">
          Ao salvar, este número é sincronizado automaticamente para a Análise de Funis e o Custo por Seguidor é calculado.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <ClipboardList className="h-4 w-4 text-primary" />
            O que fizemos esta semana
          </div>
          <Textarea
            value={whatWeDid}
            onChange={e => setWhatWeDid(e.target.value)}
            placeholder="Ex: Criamos 3 novos criativos, ajustamos público da campanha X..."
            className="min-h-[120px] resize-none"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <ArrowRight className="h-4 w-4 text-primary" />
            Próximas Ações
          </div>
          <Textarea
            value={nextActions}
            onChange={e => setNextActions(e.target.value)}
            placeholder="Ex: Testar vídeo UGC, escalar campanha Y, revisar público Z..."
            className="min-h-[120px] resize-none"
          />
        </div>
      </div>
    </motion.div>
  );
}
