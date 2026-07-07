import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Facebook, 
  Calendar, 
  HardDrive, 
  Link as LinkIcon, 
  CheckCircle,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { Client } from "@/hooks/useClients";

interface IntegrationsTabProps {
  selectedClient: Client | null;
}

export function IntegrationsTab({ selectedClient }: IntegrationsTabProps) {
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [driveConnected, setDriveConnected] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Integrações de Plataforma</h3>
        <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold">2 Ativas</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* WhatsApp Card */}
        <Card className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/20 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <Badge className={`text-[10px] font-bold py-0.5 rounded-full ${
                whatsappConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.03] text-muted-foreground border border-border/60"
              }`}>
                {whatsappConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-200">WhatsApp (Evolution API)</h4>
              <p className="text-[10px] text-muted-foreground leading-normal mt-1">Conecte o número de suporte ou alertas para envio automático de relatórios de CPA, budget e saldos.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.04]">
            {whatsappConnected ? (
              <Button variant="ghost" size="sm" onClick={() => setWhatsappConnected(false)} className="h-8 text-xs text-destructive hover:bg-destructive/10">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setWhatsappConnected(true)} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-lg">Conectar Número</Button>
            )}
          </div>
        </Card>

        {/* Facebook Ads Card */}
        <Card className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/20 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Facebook className="h-5 w-5" />
              </div>
              <Badge className={`text-[10px] font-bold py-0.5 rounded-full ${
                facebookConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.03] text-muted-foreground border border-border/60"
              }`}>
                {facebookConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-200">Facebook & Meta Ads</h4>
              <p className="text-[10px] text-muted-foreground leading-normal mt-1">Integração oficial via API Graph do Facebook para puxar investimento geral, CPA e alcance das campanhas de clientes.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.04]">
            {facebookConnected ? (
              <Button variant="ghost" size="sm" onClick={() => setFacebookConnected(false)} className="h-8 text-xs text-destructive hover:bg-destructive/10">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setFacebookConnected(true)} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-lg">Autorizar OAuth</Button>
            )}
          </div>
        </Card>

        {/* Google Ads Card */}
        <Card className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/20 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge className={`text-[10px] font-bold py-0.5 rounded-full ${
                googleConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.03] text-muted-foreground border border-border/60"
              }`}>
                {googleConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-200">Google Ads <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] scale-90 font-bold ml-1">BETA</Badge></h4>
              <p className="text-[10px] text-muted-foreground leading-normal mt-1">Vincula contas de clientes do Google Ads usando OAuth para ler dados de investimento diário e métricas de campanhas de pesquisa e PMax.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.04]">
            {googleConnected ? (
              <Button variant="ghost" size="sm" onClick={() => setGoogleConnected(false)} className="h-8 text-xs text-destructive hover:bg-destructive/10">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setGoogleConnected(true)} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-lg">Conectar Google</Button>
            )}
          </div>
        </Card>

        {/* Google Drive Card */}
        <Card className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/20 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <HardDrive className="h-5 w-5" />
              </div>
              <Badge className={`text-[10px] font-bold py-0.5 rounded-full ${
                driveConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.03] text-muted-foreground border border-border/60"
              }`}>
                {driveConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-200">Google Drive & Sheets</h4>
              <p className="text-[10px] text-muted-foreground leading-normal mt-1">Habilita a exportação direta de relatórios no Google Sheets e gravação de backups em planilhas na nuvem de forma programada.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.04]">
            {driveConnected ? (
              <Button variant="ghost" size="sm" onClick={() => setDriveConnected(false)} className="h-8 text-xs text-destructive hover:bg-destructive/10">Desconectar</Button>
            ) : (
              <Button size="sm" onClick={() => setDriveConnected(true)} className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-lg">Autorizar Drive</Button>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
