import { useState } from "react";
import { Megaphone, Search, Globe, Instagram, Sheet as SheetIcon, Plus, Pencil, Trash2, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Client } from "@/hooks/useClients";
import { useClientSheets, useSaveClientSheet, useDeleteClientSheet, ClientSheet } from "@/hooks/useClientSheets";

interface Props { client: Client }

function StatusDot({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-primary" />
    : <Circle className="h-4 w-4 text-muted-foreground/60" />;
}

function IntegrationCard({
  icon: Icon, title, status, description, action,
}: { icon: any; title: string; status: boolean; description: string; action?: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <StatusDot ok={status} />
              <span className="text-xs text-muted-foreground">{status ? "Conectado" : "Não configurado"}</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      {action}
    </Card>
  );
}

export function DataSourcesPanel({ client }: Props) {
  const { data: sheets } = useClientSheets(client.id);
  const save = useSaveClientSheet();
  const remove = useDeleteClientSheet();

  const [editing, setEditing] = useState<ClientSheet | null>(null);

  const empty: ClientSheet = {
    client_id: client.id,
    name: "",
    spreadsheet_id: "",
    spreadsheet_url: "",
    sheet_name: "Página1",
    header_row: 1,
    range_a1: "",
    field_mapping: {},
  };

  const extractId = (url: string) => {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : url;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Dê um nome para a planilha");
    const sid = extractId(editing.spreadsheet_url || editing.spreadsheet_id || "");
    if (!sid) return toast.error("Informe o link ou ID da planilha");
    try {
      await save.mutateAsync({ ...editing, spreadsheet_id: sid });
      toast.success("Planilha salva");
      setEditing(null);
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Integrações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntegrationCard
            icon={Megaphone} title="Meta Ads"
            status={!!client.meta_access_token && (client.ad_account_ids?.length || 0) > 0}
            description={`${client.ad_account_ids?.length || 0} conta(s) vinculada(s).`}
          />
          <IntegrationCard
            icon={Search} title="Google Ads"
            status={!!(client as any).google_ads_customer_id}
            description={(client as any).google_ads_customer_id ? `Customer ID: ${(client as any).google_ads_customer_id}` : "Adicione o Customer ID na aba Google."}
          />
          <IntegrationCard
            icon={Globe} title="Google Analytics 4"
            status={!!(client as any).ga_property_id}
            description={(client as any).ga_property_id ? `Property: ${(client as any).ga_property_id}` : "Adicione o Property ID na aba Google."}
          />
          <IntegrationCard
            icon={Instagram} title="Instagram"
            status={!!client.meta_access_token}
            description="Insights orgânicos vêm com o mesmo token do Meta Ads."
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Planilhas (Google Sheets)</h3>
          <Button size="sm" className="gap-1.5" onClick={() => setEditing(empty)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar planilha
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(sheets || []).length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground col-span-full">
              Nenhuma planilha cadastrada. Adicione múltiplas planilhas para usar em diferentes blocos.
            </Card>
          )}
          {(sheets || []).map(sh => (
            <Card key={sh.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SheetIcon className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">{sh.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {sh.spreadsheet_url && (
                    <a href={sh.spreadsheet_url} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(sh)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                    if (!confirm(`Remover planilha "${sh.name}"?`)) return;
                    await remove.mutateAsync({ id: sh.id!, clientId: client.id });
                    toast.success("Removida");
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <div>Aba: <span className="text-foreground/80">{sh.sheet_name || "Página1"}</span></div>
                {sh.range_a1 && <div>Range: <span className="text-foreground/80">{sh.range_a1}</span></div>}
                <div>
                  Status:{" "}
                  {sh.last_sync_status === "ok" ? (
                    <Badge variant="outline" className="text-[10px] py-0">{sh.last_sync_rows || 0} linhas</Badge>
                  ) : sh.last_sync_status ? (
                    <span className="text-destructive">{sh.last_sync_status}</span>
                  ) : (
                    <span>nunca sincronizada</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar planilha" : "Nova planilha"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome amigável</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="ex: Vendas Hotmart" />
              </div>
              <div>
                <Label>Link da planilha (Google Sheets)</Label>
                <Input value={editing.spreadsheet_url || ""} onChange={(e) => setEditing({ ...editing, spreadsheet_url: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Aba</Label>
                  <Input value={editing.sheet_name || ""} onChange={(e) => setEditing({ ...editing, sheet_name: e.target.value })} />
                </div>
                <div>
                  <Label>Linha do cabeçalho</Label>
                  <Input type="number" value={editing.header_row || 1} onChange={(e) => setEditing({ ...editing, header_row: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Range A1 (opcional)</Label>
                <Input value={editing.range_a1 || ""} onChange={(e) => setEditing({ ...editing, range_a1: e.target.value })} placeholder="A1:Z1000" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}