import { useState } from "react";
import { useGestorClientMeta, useSaveGestorClientMeta } from "@/hooks/useGestorDiary";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Trash2, ArrowRight, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useAllClientManagerMeta, useUpsertClientHealth } from "@/hooks/useClientManagerMeta";
import { useClientTasks } from "@/hooks/useClientTasks";
import { ClientTasksDialog } from "./ClientTasksDialog";

interface ClientCardProps {
  gestorId: string;
  clientId: string;
  clientName: string;
  clientStatus: string;
  isPaused?: boolean;
  onUnlink?: () => void;
}

export default function ClientCard({ gestorId, clientId, clientName, clientStatus, isPaused, onUnlink }: ClientCardProps) {
  const { data: meta } = useGestorClientMeta(gestorId, clientId);
  const saveMeta = useSaveGestorClientMeta();
  const { data: healthMap } = useAllClientManagerMeta();
  const upsertHealth = useUpsertClientHealth();
  const [tasksOpen, setTasksOpen] = useState(false);

  const { data: tasks = [] } = useClientTasks(clientId);

  const handleHealthChange = async (val: string) => {
    const score = parseInt(val, 10);
    try {
      // 1. Update global health score
      await upsertHealth.mutateAsync({ clientId, score });
      
      // 2. Update diary health score
      await saveMeta.mutateAsync({
        gestor_id: gestorId,
        client_id: clientId,
        meta: { health: score }
      });
      
      toast.success("Saúde do cliente atualizada!");
    } catch (e: any) {
      toast.error("Erro ao atualizar saúde: " + e.message);
    }
  };

  const health = healthMap?.[clientId] ?? meta?.health ?? 10;
  const openTasksCount = tasks.filter(t => !t.completed).length;

  const healthColor = health >= 8 ? "bg-emerald-500" : 
                      health >= 5 ? "bg-amber-500" : 
                      "bg-red-500";

  return (
    <Card className="bg-card/45 border border-border/40 hover:border-border hover:bg-card/65 transition-all p-4 rounded-xl flex flex-col justify-between gap-4 h-full">
      {/* Upper Row: Client Info, Dashboard Link, Unlink Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${healthColor}`} />
          <div className="min-w-0">
            <p className="font-bold text-slate-100 text-sm truncate uppercase tracking-tight" title={clientName}>
              {clientName}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {isPaused ? (
                <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border/40 text-[10px] py-0 px-1 font-normal h-4 shrink-0">Pausado</Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] py-0 px-1 font-normal h-4 shrink-0">{clientStatus}</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`/dashboard/${clientId}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 hover:bg-primary/10 text-primary hover:text-primary rounded-md transition-colors"
            title="Acessar Dashboard"
          >
            <ArrowRight className="h-4 w-4" />
          </a>
          {onUnlink && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              onClick={onUnlink}
              title="Desvincular Cliente"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row: Health Selector and Tasks Button */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/30 mt-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">Saúde:</span>
          <Select value={health.toString()} onValueChange={handleHealthChange}>
            <SelectTrigger className="h-6 w-12 text-[10px] bg-background border-border/60 text-slate-300 font-bold justify-center px-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border/60">
              {[10,9,8,7,6,5,4,3,2,1,0].map(n => (
                <SelectItem key={n} value={n.toString()} className="text-[10px] font-bold">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-slate-400 font-bold">/10</span>
        </div>

        {!isPaused && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTasksOpen(true)}
            className="h-7 text-[10px] px-2.5 font-bold border-border/60 hover:bg-muted/50 gap-1.5 shrink-0"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>Tarefas</span>
            {openTasksCount > 0 && (
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded-[4px] text-[9px] font-extrabold leading-none">
                {openTasksCount}
              </span>
            )}
          </Button>
        )}
      </div>

      <ClientTasksDialog
        open={tasksOpen}
        onOpenChange={setTasksOpen}
        clientId={clientId}
        clientName={clientName}
      />
    </Card>
  );
}
