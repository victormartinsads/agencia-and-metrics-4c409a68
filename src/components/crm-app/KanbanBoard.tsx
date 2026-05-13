import { useMemo, useState } from "react";
import { Lead, LeadStatus, STATUS_CONFIG } from "@/lib/crm-app";
import { LeadCard } from "./LeadCard";
import { useUpdateLeadStatus } from "@/hooks/useCrmAppLeads";
import { toast } from "sonner";

const COLUMNS: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'closed', 'lost'];

export function KanbanBoard({
  leads,
  orgId,
  onCardClick,
  selectedIds,
  onToggleSelect,
}: {
  leads: Lead[];
  orgId: string;
  onCardClick: (l: Lead) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const update = useUpdateLeadStatus(orgId);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<LeadStatus, Lead[]>();
    for (const c of COLUMNS) m.set(c, []);
    for (const l of leads) m.get(l.status)?.push(l);
    return m;
  }, [leads]);

  const handleDrop = async (status: LeadStatus) => {
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.status === status) return;
    try {
      await update.mutateAsync({ id: lead.id, status, oldStatus: lead.status });
    } catch (e: any) {
      toast.error(e.message || "Erro ao mover");
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const cfg = STATUS_CONFIG[status];
        const list = grouped.get(status) || [];
        return (
          <div
            key={status}
            className="min-w-[280px] w-[280px] shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(status)}
          >
            <div className="rounded-lg bg-secondary/40 border border-border p-2 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                  <span className="text-xs text-muted-foreground">({list.length})</span>
                </div>
              </div>
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[65vh]">
                {list.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onClick={() => onCardClick(l)}
                    onDragStart={() => setDraggingId(l.id)}
                    selected={selectedIds?.has(l.id)}
                    onToggleSelect={onToggleSelect ? () => onToggleSelect(l.id) : undefined}
                  />
                ))}
                {list.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-6">Vazio</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}