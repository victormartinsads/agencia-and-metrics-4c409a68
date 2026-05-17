import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Globe, Sheet, Instagram, Hand, Megaphone, Search } from "lucide-react";
import { toast } from "sonner";
import {
  BlockSource, BlockSourceType,
  useBlockSources, useSaveBlockSource, useDeleteBlockSource,
} from "@/hooks/useBlockSources";
import { useClientSheets } from "@/hooks/useClientSheets";

const SOURCES: { id: BlockSourceType; label: string; icon: any; desc: string }[] = [
  { id: "auto",       label: "Automático", icon: Zap,       desc: "Usa a fonte padrão do bloco." },
  { id: "ga4",        label: "GA4",        icon: Globe,     desc: "Google Analytics 4 — sessões, usuários, eventos." },
  { id: "meta",       label: "Meta Ads",   icon: Megaphone, desc: "Facebook & Instagram Ads." },
  { id: "google_ads", label: "Google Ads", icon: Search,    desc: "Campanhas Google Ads." },
  { id: "sheet",      label: "Planilha",   icon: Sheet,     desc: "Google Sheets — escolha qual planilha e campo." },
  { id: "instagram",  label: "Instagram",  icon: Instagram, desc: "Insights orgânicos do Instagram." },
  { id: "manual",     label: "Manual",     icon: Hand,      desc: "Digite o valor manualmente." },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  dashboardKey: string;
  blockId: string;
  blockTitle: string;
}

export function BlockSourceMenu({ open, onOpenChange, clientId, dashboardKey, blockId, blockTitle }: Props) {
  const { data: sources } = useBlockSources(clientId, dashboardKey);
  const { data: sheets } = useClientSheets(clientId);
  const save = useSaveBlockSource();
  const remove = useDeleteBlockSource();

  const current = sources?.[blockId];
  const [type, setType] = useState<BlockSourceType>(current?.source_type || "auto");
  const [config, setConfig] = useState<Record<string, any>>(current?.config || {});

  useEffect(() => {
    if (open) {
      setType(current?.source_type || "auto");
      setConfig(current?.config || {});
    }
  }, [open, current?.source_type, current?.config]);

  const handleSave = async () => {
    try {
      if (type === "auto") {
        await remove.mutateAsync({ clientId, dashboardKey, blockId });
      } else {
        const src: BlockSource = { client_id: clientId, dashboard_key: dashboardKey, block_id: blockId, source_type: type, config };
        await save.mutateAsync(src);
      }
      toast.success("Fonte salva");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fonte de dados — {blockTitle}</DialogTitle>
          <DialogDescription>Escolha de onde vêm os números deste bloco.</DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as BlockSourceType); setConfig({}); }}>
          <TabsList className="grid grid-cols-7 w-full">
            {SOURCES.map(s => {
              const Icon = s.icon;
              return (
                <TabsTrigger key={s.id} value={s.id} className="flex flex-col gap-1 h-auto py-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[10px]">{s.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SOURCES.map(s => (
            <TabsContent key={s.id} value={s.id} className="space-y-3 pt-4">
              <p className="text-xs text-muted-foreground">{s.desc}</p>

              {s.id === "ga4" && (
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={config.metric || ""} onValueChange={(v) => setConfig({ ...config, metric: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {["sessions","totalUsers","newUsers","screenPageViews","bounceRate","averageSessionDuration","engagedSessions","conversions","totalRevenue"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {s.id === "meta" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Métrica</Label>
                    <Select value={config.metric || ""} onValueChange={(v) => setConfig({ ...config, metric: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                      <SelectContent>
                        {["spend","impressions","reach","clicks","ctr","cpm","cpc","conversions","cpa","roas","revenue"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ação (opcional)</Label>
                    <Input placeholder="purchase, lead, ..." value={config.action_type || ""} onChange={(e) => setConfig({ ...config, action_type: e.target.value })} />
                  </div>
                </div>
              )}

              {s.id === "google_ads" && (
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={config.metric || ""} onValueChange={(v) => setConfig({ ...config, metric: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {["cost","impressions","clicks","conversions","ctr","cpc","conversion_rate","cost_per_conversion","conversion_value"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {s.id === "sheet" && (
                <div className="space-y-3">
                  <div>
                    <Label>Planilha</Label>
                    <Select value={config.sheet_id || ""} onValueChange={(v) => setConfig({ ...config, sheet_id: v })}>
                      <SelectTrigger><SelectValue placeholder={sheets && sheets.length ? "Selecione…" : "Nenhuma planilha cadastrada"} /></SelectTrigger>
                      <SelectContent>
                        {(sheets || []).map(sh => (
                          <SelectItem key={sh.id} value={sh.id!}>{sh.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Coluna / Campo</Label>
                      <Input value={config.field || ""} onChange={(e) => setConfig({ ...config, field: e.target.value })} placeholder="ex: faturamento" />
                    </div>
                    <div>
                      <Label>Agregação</Label>
                      <Select value={config.agg || "sum"} onValueChange={(v) => setConfig({ ...config, agg: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["sum","avg","count","last"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cadastre planilhas em <strong>Configurações → Fontes de dados</strong>.
                  </p>
                </div>
              )}

              {s.id === "instagram" && (
                <div className="space-y-2">
                  <Label>Métrica</Label>
                  <Select value={config.metric || ""} onValueChange={(v) => setConfig({ ...config, metric: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                    <SelectContent>
                      {["followers","reach","impressions","profile_views","website_clicks","video_views","likes","comments","saves","shares"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {s.id === "manual" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Valor</Label>
                    <Input type="number" value={config.value ?? ""} onChange={(e) => setConfig({ ...config, value: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Rótulo (opcional)</Label>
                    <Input value={config.label || ""} onChange={(e) => setConfig({ ...config, label: e.target.value })} />
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || remove.isPending}>Salvar fonte</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}