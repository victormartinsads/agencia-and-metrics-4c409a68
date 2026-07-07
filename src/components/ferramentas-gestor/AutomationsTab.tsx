import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Settings2, 
  Sparkles, 
  Bot, 
  CheckCircle2, 
  Webhook,
  HelpCircle
} from "lucide-react";

export function AutomationsTab() {
  const [routines, setRoutines] = useState([
    { id: 1, name: "Atualização de saldos diários", desc: "Verifica e envia o saldo das contas no WhatsApp", active: true, platform: "Meta Ads" },
    { id: 2, name: "Status e alertas de campanhas", desc: "Reporta campanhas pausadas ou com instabilidade", active: false, platform: "Meta Ads" },
    { id: 3, name: "Disparador de relatórios semanais", desc: "Envia o resumo de investimento no domingo", active: true, platform: "Meta Ads" },
  ]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<any>(null);
  
  // Dialog config states
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [whatsappJid, setWhatsappJid] = useState("1203632948756182@g.us");
  const [autoSend, setAutoSend] = useState(true);

  const toggleRoutine = (id: number) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const openConfig = (routine: any) => {
    setEditingRoutine(routine);
    setDialogOpen(true);
  };

  const saveConfig = () => {
    setDialogOpen(false);
    // In production we would call a Supabase mutation here
  };

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Rotinas do Facebook Ads</h3>
        <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold">3 Ativas</Badge>
      </div>

      {/* Routines List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {routines.map(r => (
          <Card key={r.id} className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-200 leading-tight">{r.name}</h4>
                  <p className="text-[10px] text-muted-foreground leading-normal">{r.desc}</p>
                </div>
                <Switch checked={r.active} onCheckedChange={() => toggleRoutine(r.id)} />
              </div>
              <Badge variant="outline" className="text-[9px] border-border text-slate-400 rounded-md font-medium px-2 py-0.5">
                {r.platform}
              </Badge>
            </div>

            <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/[0.04]">
              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Sincronizado
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openConfig(r)} className="h-8 text-xs border-border hover:bg-white/[0.05] font-semibold gap-1">
                  <Settings2 className="h-3.5 w-3.5" /> Configurar
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs border-border hover:bg-white/[0.05] font-semibold text-primary gap-1">
                  <Play className="h-3.5 w-3.5" /> Executar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Routine Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-200">
              Configurações: {editingRoutine?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste as configurações de disparo automático da rotina no WhatsApp.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-send" className="text-xs font-semibold">Habilitar envio automático</Label>
              <Switch id="auto-send" checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-xs font-semibold">Horário de envio</Label>
              <select 
                id="time" 
                value={scheduleTime} 
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl text-xs h-9 px-3 focus:outline-none focus:border-primary"
              >
                <option value="07:00">07:00</option>
                <option value="08:00">08:00</option>
                <option value="09:00">09:00</option>
                <option value="12:00">12:00</option>
                <option value="18:00">18:00</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jid" className="text-xs font-semibold flex items-center gap-1">
                ID do Grupo no WhatsApp (JID)
                <span title="Identificador único do grupo obtido no Evolution API">
                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                </span>
              </Label>
              <Input 
                id="jid" 
                value={whatsappJid} 
                onChange={e => setWhatsappJid(e.target.value)}
                className="bg-background border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="hover:bg-white/[0.03] text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={saveConfig} className="text-xs font-bold bg-primary text-primary-foreground shadow-lg">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
