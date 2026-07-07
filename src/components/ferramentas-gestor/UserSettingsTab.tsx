import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Bell, 
  Building2, 
  Users, 
  CreditCard, 
  HelpCircle,
  Shield,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export function UserSettingsTab() {
  const [activeSection, setActiveSection] = useState("plano");
  
  const menuItems = [
    { id: "conta", label: "Minha Conta", icon: User },
    { id: "alertas", label: "Alertas", icon: Bell },
    { id: "organizacao", label: "Organização", icon: Building2 },
    { id: "colaboradores", label: "Colaboradores", icon: Users },
    { id: "plano", label: "Plano & Limites", icon: CreditCard },
    { id: "suporte", label: "Suporte", icon: HelpCircle },
  ];

  return (
    <div className="flex h-[600px] border border-border/60 rounded-2xl overflow-hidden bg-card text-slate-100">
      {/* Settings Navigation Sidebar */}
      <aside className="w-52 shrink-0 border-r border-border/60 bg-white/[0.01] p-4 space-y-4">
        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2">Configurações</div>
        <nav className="space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeSection === item.id 
                  ? "bg-white/[0.04] text-foreground" 
                  : "text-muted-foreground hover:bg-white/[0.02]"
              }`}
            >
              <item.icon className="h-4 w-4 opacity-70" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Settings Display Area */}
      <main className="flex-1 overflow-y-auto p-6 bg-background/40">
        {activeSection === "plano" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-200">Plano & Limites</h3>
              <p className="text-xs text-muted-foreground">Gerencie o faturamento de sua organização e acompanhe os limites de uso.</p>
            </div>

            {/* Plan Info Card */}
            <Card className="bg-card/80 border-border/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-full w-1/3 opacity-5 bg-radial-gradient from-primary to-transparent pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-200">Plano Pro Agency Trial</h4>
                    <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold py-0.5 rounded-full">Ativo</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Sua assinatura expira em 13 de Julho de 2026. Plano atual no valor de R$ 247,00/mês.</p>
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs h-8 shadow-lg">Alterar Plano</Button>
              </div>
            </Card>

            {/* Limits Progress Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Uso dos Limites</h4>
              <Card className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl">
                {/* Limit 1: Accounts */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Contas de Clientes</span>
                    <span className="text-muted-foreground">3 de 20 clientes</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: "15%" }} />
                  </div>
                </div>

                {/* Limit 2: IA Credits */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Créditos de IA (Assistente)</span>
                    <span className="text-muted-foreground">0 de 300 créditos</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: "0%" }} />
                  </div>
                </div>

                {/* Limit 3: WhatsApp Numbers */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">Conexões de WhatsApp</span>
                    <span className="text-muted-foreground">0 de 1 número conectado</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: "0%" }} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Credit Card Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Forma de Pagamento</h4>
              <Card className="bg-card/80 border-border/60 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-12 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-slate-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Visa •••• 2471</h5>
                    <p className="text-[10px] text-muted-foreground">Expiração: 12/30 · Titular: VICTOR DE BARROS MARTINS</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold text-primary hover:bg-white/[0.03]">Atualizar</Button>
              </Card>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Faturas Anteriores</h4>
              <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-xl">
                <div className="divide-y divide-white/[0.04]">
                  <div className="p-3 flex items-center justify-between text-[11px] font-medium hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300">Fatura #ADS-4872</span>
                      <span className="text-muted-foreground">06/07/2026</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-200">R$ 247,00</span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-white/[0.03] text-[10px] font-bold text-primary flex items-center gap-0.5">
                        Baixar PDF <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        )}

        {activeSection !== "plano" && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 h-full">
            <Shield className="h-10 w-10 text-muted-foreground/40" />
            <h4 className="text-xs font-bold text-foreground">Sub-aba em desenvolvimento</h4>
            <p className="text-[10px] text-muted-foreground max-w-[200px]">Esta sub-seção está sendo integrada com as tabelas de segurança do seu perfil Supabase.</p>
          </div>
        )}
      </main>
    </div>
  );
}
