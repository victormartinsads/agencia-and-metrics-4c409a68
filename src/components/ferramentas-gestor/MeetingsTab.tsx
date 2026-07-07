import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, AlertCircle, Clock, FileText, User } from "lucide-react";

export function MeetingsTab() {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  
  const meetings = [
    { id: 1, title: "Alinhamento Semanal - Advocacia Sul", time: "14:00 - 14:30", day: 6, client: "Advocacia Sul", ata: "Discutido otimizações de CPA no Meta Ads" },
    { id: 2, title: "Reunião de Onboarding - Kairos", time: "16:00 - 17:00", day: 6, client: "BM 01 Kairos", ata: "Cliente prefere focar em tráfego para WhatsApp no primeiro mês" },
    { id: 3, title: "Apresentação de Resultados Mentoria", time: "10:00 - 10:45", day: 8, client: "Mentoria Advogados", ata: "" },
  ];

  const currentMeetings = meetings.filter(m => m.day === selectedDay);

  // Generate days array for a standard monthly grid (31 days)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      {/* Alert Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-blue-300">Integração com Google Calendar pendente</h4>
          <p className="text-[11px] text-slate-400">Sincronize com seu Google Calendar nas Integrações para importar todas as suas reuniões de forma 100% automática.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Monthly Calendar */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Julho 2026</h3>
            <Button size="sm" className="h-8 text-xs font-bold gap-1">
              <Plus className="h-3.5 w-3.5" /> Novo Evento
            </Button>
          </div>

          <Card className="bg-card/80 border-border/60 rounded-2xl p-5 shadow-xl">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-muted-foreground tracking-wider mb-2">
              <div>Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {/* Empty spaces for start of month (Jul 2026 starts on Wednesday, so 3 empty slots) */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-transparent" />
              ))}
              
              {days.map(day => {
                const hasMeetings = meetings.some(m => m.day === day);
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square flex flex-col justify-between p-1.5 rounded-xl border text-xs font-bold transition-all relative ${
                      isSelected 
                        ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                        : "bg-white/[0.01] border-white/[0.04] text-slate-300 hover:border-white/[0.1] hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>{day}</span>
                    {hasMeetings && (
                      <span className={`h-1.5 w-1.5 rounded-full self-center mb-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary animate-pulse"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Events & Minutes (Ata) */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest px-1">Compromissos do Dia {selectedDay}</h3>
          
          <div className="space-y-4">
            {currentMeetings.length > 0 ? (
              currentMeetings.map(m => (
                <Card key={m.id} className="bg-card/80 border-border/60 rounded-2xl p-4 space-y-4 shadow-lg">
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-200 leading-tight">{m.title}</h4>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> {m.time}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {m.client}</span>
                    </div>
                  </div>
                  
                  {m.ata ? (
                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Ata de Reunião
                      </div>
                      <p className="text-[11px] text-slate-300 italic">"{m.ata}"</p>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full text-[10px] h-8 border-border hover:bg-white/[0.05] font-semibold gap-1">
                      <Plus className="h-3 w-3" /> Adicionar Ata / Notas
                    </Button>
                  )}
                </Card>
              ))
            ) : (
              <Card className="bg-card/80 border-border/60 rounded-2xl p-6 text-center shadow-lg">
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="h-10 w-10 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-muted-foreground/50">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-foreground">Sem compromissos</div>
                  <p className="text-[10px] text-muted-foreground max-w-[150px] mx-auto">Nenhum evento agendado para o dia selecionado.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
