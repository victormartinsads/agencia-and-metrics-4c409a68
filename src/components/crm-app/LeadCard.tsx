import { Lead } from "@/lib/crm-app";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  lead: Lead;
  onClick?: () => void;
  onDragStart?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}

function getTagColor(tag: string) {
  const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    { bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { bg: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    { bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  ];
  return colors[hash % colors.length].bg;
}

function getInitials(name: string | null) {
  if (!name) return "U";
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

function safeFormatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function LeadCard({ lead, onClick, onDragStart, selected, onToggleSelect }: Props) {
  const startFmt = safeFormatDate(lead.created_at);
  const endFmt = lead.updated_at ? safeFormatDate(lead.updated_at) : startFmt;

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-3.5 cursor-pointer bg-card hover:bg-muted/10 border-border/80 hover:border-primary/60 transition-all shadow-sm rounded-xl space-y-2.5 relative group ${selected ? "border-primary ring-1 ring-primary/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0 flex-1">
          <div className="text-xs font-extrabold text-foreground group-hover:text-primary transition-colors truncate">
            {lead.product || "Oportunidade de Vendas"}
          </div>
          {lead.name && (
            <div className="text-[11px] font-semibold text-blue-400 hover:underline truncate">
              {lead.name}
            </div>
          )}
        </div>
        {onToggleSelect && (
          <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Checkbox checked={!!selected} />
          </div>
        )}
      </div>

      {lead.company && (
        <div className="text-[11px] text-muted-foreground font-medium truncate flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          {lead.company}
        </div>
      )}

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.tags.map((t) => (
            <span 
              key={t} 
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${getTagColor(t)}`}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
        <span>{startFmt}</span>
        <span className="text-muted-foreground/50">➔</span>
        <span>{endFmt}</span>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-1">
        {lead.value && lead.value > 0 ? (
          <div className="text-xs font-black text-foreground">
            {Number(lead.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">Sem valor</div>
        )}
        
        {/* Assignee Avatar (Flowlu style) */}
        <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-extrabold text-primary flex items-center justify-center" title={lead.name || "Sem responsável"}>
          {getInitials(lead.name)}
        </div>
      </div>
    </Card>
  );
}