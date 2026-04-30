import { Lead } from "@/lib/crm-app";
import { Card } from "@/components/ui/card";
import { Mail, Phone, DollarSign } from "lucide-react";

interface Props { lead: Lead; onClick?: () => void; onDragStart?: () => void; }

export function LeadCard({ lead, onClick, onDragStart }: Props) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-2.5 cursor-pointer hover:border-primary/60 transition-colors space-y-1.5"
    >
      <div className="text-sm font-medium text-foreground truncate">
        {lead.name || lead.email || "Sem nome"}
      </div>
      {lead.company && <div className="text-[11px] text-muted-foreground truncate">{lead.company}</div>}
      {lead.email && (
        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" /> {lead.email}
        </div>
      )}
      {lead.phone && (
        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
          <Phone className="h-3 w-3" /> {lead.phone}
        </div>
      )}
      {lead.value && lead.value > 0 && (
        <div className="text-[11px] text-primary font-semibold flex items-center gap-1">
          <DollarSign className="h-3 w-3" /> R$ {Number(lead.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </div>
      )}
      {lead.source && (
        <div className="text-[10px] text-muted-foreground">via {lead.source}</div>
      )}
    </Card>
  );
}