import { Lead, STATUS_CONFIG } from "@/lib/crm-app";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./StatusBadge";

export function LeadsList({
  leads,
  onClick,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: {
  leads: Lead[];
  onClick: (l: Lead) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const allSelected = !!selectedIds && leads.length > 0 && leads.every((l) => selectedIds.has(l.id));
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {onToggleSelect && (
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={(v) => onToggleAll?.(!!v)} />
              </TableHead>
            )}
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow key={l.id} className={`cursor-pointer ${selectedIds?.has(l.id) ? "bg-accent/40" : ""}`}>
              {onToggleSelect && (
                <TableCell onClick={(e) => { e.stopPropagation(); onToggleSelect(l.id); }}>
                  <Checkbox checked={selectedIds?.has(l.id)} />
                </TableCell>
              )}
              <TableCell className="font-medium" onClick={() => onClick(l)}>{l.name || "—"}</TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>{l.email || "—"}</TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>{l.phone || "—"}</TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>{l.source || "—"}</TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>
                {l.tags && l.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {l.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">{t}</span>
                    ))}
                  </div>
                ) : "—"}
              </TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>{l.value ? `R$ ${Number(l.value).toLocaleString("pt-BR")}` : "—"}</TableCell>
              <TableCell onClick={() => onClick(l)}><StatusBadge status={l.status} size="sm" /></TableCell>
              <TableCell className="text-xs" onClick={() => onClick(l)}>{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow><TableCell colSpan={onToggleSelect ? 9 : 8} className="text-center text-muted-foreground py-8">Nenhum lead</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}