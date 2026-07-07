import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Folder, 
  CheckCircle2, 
  Circle,
  Calendar,
  Lock,
  List,
  KanbanSquare
} from "lucide-react";

export function TasksTab() {
  const [workspaces, setWorkspaces] = useState(["Meu Workspace", "Time de Criação"]);
  const [activeWorkspace, setActiveWorkspace] = useState("Meu Workspace");
  const [activeSubTab, setActiveSubTab] = useState("kanban");
  
  const [tasks, setTasks] = useState([
    { id: 1, title: "Subir criativos novos na BM Advocacia", status: "pending", desc: "Prazo: 08/07" },
    { id: 2, title: "Análise de métricas Google Ads", status: "progress", desc: "Ajustar CPC médio" },
    { id: 3, title: "Criar grupo de WhatsApp para relatórios automáticos", status: "completed", desc: "Evolution API" },
  ]);

  const moveTask = (id: number, newStatus: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="flex h-[600px] border border-border/60 rounded-2xl overflow-hidden bg-card text-slate-100">
      {/* Workspace Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/60 bg-white/[0.01] p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2">Workspaces</div>
          <nav className="space-y-1">
            {workspaces.map(w => (
              <button
                key={w}
                onClick={() => setActiveWorkspace(w)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeWorkspace === w 
                    ? "bg-white/[0.04] text-foreground" 
                    : "text-muted-foreground hover:bg-white/[0.02]"
                }`}
              >
                <Folder className="h-4 w-4 opacity-70" />
                {w}
              </button>
            ))}
          </nav>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 px-3 hover:bg-white/[0.03] text-xs font-bold text-muted-foreground">
          <Plus className="h-4 w-4" /> Novo Workspace
        </Button>
      </aside>

      {/* Main tasks panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/40">
        <header className="h-14 border-b border-border/60 bg-card/50 px-6 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold">{activeWorkspace}</h2>
            <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-fit">
              <TabsList className="bg-transparent p-0 gap-1 border-none">
                <TabsTrigger value="kanban" className="px-3 py-1 text-xs font-bold rounded-lg data-[state=active]:bg-white/[0.04] cursor-pointer"><KanbanSquare className="h-3.5 w-3.5 mr-1" /> Kanban</TabsTrigger>
                <TabsTrigger value="lista" className="px-3 py-1 text-xs font-bold rounded-lg data-[state=active]:bg-white/[0.04] cursor-pointer"><List className="h-3.5 w-3.5 mr-1" /> Lista</TabsTrigger>
                <TabsTrigger value="rotinas" className="px-3 py-1 text-xs font-bold rounded-lg data-[state=active]:bg-white/[0.04] cursor-pointer"><Lock className="h-3.5 w-3.5 mr-1" /> Rotinas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button size="sm" className="h-8 text-xs font-bold gap-1">
            <Plus className="h-3.5 w-3.5" /> Nova Tarefa
          </Button>
        </header>

        {/* Content View */}
        <div className="flex-1 overflow-auto p-6">
          {activeSubTab === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
              {/* Columns */}
              {["pending", "progress", "completed"].map(status => {
                const list = tasks.filter(t => t.status === status);
                const colTitle = status === "pending" ? "Pendentes" : status === "progress" ? "Em Andamento" : "Concluídas";
                return (
                  <div key={status} className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center px-1 shrink-0">
                      <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest">{colTitle}</h3>
                      <Badge className="bg-white/[0.03] text-muted-foreground border border-border/60 text-[10px] font-bold py-0">{list.length}</Badge>
                    </div>
                    <div className="flex-1 space-y-3 bg-white/[0.01] border border-dashed border-border/60 rounded-2xl p-3 min-h-[300px]">
                      {list.map(t => (
                        <Card key={t.id} className="bg-card border-border/60 hover:border-primary/40 transition-all rounded-xl p-4 shadow-md">
                          <h4 className="text-xs font-bold text-slate-200 leading-tight">{t.title}</h4>
                          {t.desc && <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>}
                          <div className="flex justify-end gap-1.5 mt-4 pt-2 border-t border-white/[0.04]">
                            {status !== "pending" && (
                              <Button variant="ghost" size="sm" onClick={() => moveTask(t.id, "pending")} className="h-6 text-[9px] hover:bg-white/[0.04]">Pendente</Button>
                            )}
                            {status !== "progress" && (
                              <Button variant="ghost" size="sm" onClick={() => moveTask(t.id, "progress")} className="h-6 text-[9px] hover:bg-white/[0.04]">Fazer</Button>
                            )}
                            {status !== "completed" && (
                              <Button variant="ghost" size="sm" onClick={() => moveTask(t.id, "completed")} className="h-6 text-[9px] hover:bg-white/[0.04] text-primary">Concluir</Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeSubTab === "lista" && (
            <Card className="bg-card/80 border-border/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-border/60 bg-white/[0.02] text-xs font-bold text-muted-foreground">Listagem Geral</div>
              <div className="divide-y divide-white/[0.04]">
                {tasks.map(t => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      {t.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary cursor-pointer shrink-0" onClick={() => moveTask(t.id, "pending")} />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer shrink-0" onClick={() => moveTask(t.id, "completed")} />
                      )}
                      <div>
                        <h4 className={`text-xs font-bold ${t.status === "completed" ? "line-through text-muted-foreground/60" : "text-slate-200"}`}>{t.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] font-bold py-0.5 rounded-full ${
                      t.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      t.status === "progress" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      "bg-white/[0.03] text-muted-foreground border border-border/60"
                    }`}>
                      {t.status === "completed" ? "Concluída" : t.status === "progress" ? "Em Andamento" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSubTab === "rotinas" && (
            <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-xl min-h-[350px] flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md gap-4 relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/10">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black tracking-tight text-slate-200">Rotinas Recorrentes</h3>
                  <p className="text-xs text-muted-foreground">O recurso de criação de tarefas e rotinas automáticas recorrentes do time está disponível a partir do plano **Agency**. Faça upgrade para liberar!</p>
                </div>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs">
                  Upgrade para Plano Agency
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
