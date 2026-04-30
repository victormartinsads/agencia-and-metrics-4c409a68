import { Lead, STATUS_CONFIG } from "@/lib/crm-app";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";

export function LeadsList({ leads, onClick }: { leads: Lead[]; onClick: (l: Lead) => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow key={l.id} onClick={() => onClick(l)} className="cursor-pointer">
              <TableCell className="font-medium">{l.name || "—"}</TableCell>
              <TableCell className="text-xs">{l.email || "—"}</TableCell>
              <TableCell className="text-xs">{l.phone || "—"}</TableCell>
              <TableCell className="text-xs">{l.source || "—"}</TableCell>
              <TableCell className="text-xs">{l.value ? `R$ ${Number(l.value).toLocaleString("pt-BR")}` : "—"}</TableCell>
              <TableCell><StatusBadge status={l.status} size="sm" /></TableCell>
              <TableCell className="text-xs">{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lead</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}