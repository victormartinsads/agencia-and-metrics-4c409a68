import { motion } from "framer-motion";
import { Save, Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWeeklyNotes } from "@/hooks/useWeeklyNotes";

interface Props {
  clientId: string;
  datePreset: string;
}

export function WeeklyNotesPanel({ clientId, datePreset }: Props) {
  const { whatWeDid, setWhatWeDid, nextActions, setNextActions, save, saving } = useWeeklyNotes(clientId, datePreset);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-card-foreground">📝 Anotações do Gestor</h3>
        <Button onClick={save} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
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
