import { useEffect } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyOrganizations, useCreateOrganization } from "@/hooks/useOrganizations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  value: string | null;
  onChange: (orgId: string) => void;
}

export function OrgSwitcher({ value, onChange }: Props) {
  const { data: orgs = [], isLoading } = useMyOrganizations();
  const create = useCreateOrganization();
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!value && orgs.length > 0) onChange(orgs[0].id);
  }, [orgs, value, onChange]);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value || ""} onValueChange={onChange} disabled={isLoading || orgs.length === 0}>
        <SelectTrigger className="h-9 w-[220px]">
          <SelectValue placeholder={orgs.length === 0 ? "Nenhuma organização" : "Selecione..."} />
        </SelectTrigger>
        <SelectContent>
          {orgs.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={() => setOpenNew(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Nova
      </Button>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova organização</DialogTitle>
          </DialogHeader>
          <Input placeholder="Nome da organização" value={name} onChange={(e) => setName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button
              disabled={!name.trim() || create.isPending}
              onClick={async () => {
                try {
                  const org = await create.mutateAsync({ name: name.trim() });
                  onChange(org.id);
                  setOpenNew(false);
                  setName("");
                  toast.success("Organização criada");
                } catch (e: any) { toast.error(e.message || "Erro"); }
              }}
            >Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}