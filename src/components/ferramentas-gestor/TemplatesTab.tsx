import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Filter, FileText, Settings, Trash2, Edit } from "lucide-react";

export function TemplatesTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [templates, setTemplates] = useState([
    { id: 1, name: "Template Padrão Diário", platform: "Facebook Ads", desc: "Inclui resumo de investimento diário e CPA de leads", parts: "Gasto, Cliques, Conversões" },
    { id: 2, name: "Template Mensal Detalhado", platform: "Facebook Ads", desc: "Contém CTR detalhado por conjunto de anúncios", parts: "CTR, CPC, Conversões, Alcance, ROI" },
    { id: 3, name: "Google Ads Diário Simples", platform: "Google Ads", desc: "Cliques e conversões do dia anterior", parts: "Cost, Clicks, Conversions" },
  ]);

  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplatePlatform, setNewTemplatePlatform] = useState("Facebook Ads");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  const handleCreateTemplate = () => {
    if (!newTemplateName) return;
    setTemplates(prev => [
      ...prev,
      {
        id: Date.now(),
        name: newTemplateName,
        platform: newTemplatePlatform,
        desc: newTemplateDesc,
        parts: "Gasto, Cliques, Resultados"
      }
    ]);
    setNewTemplateName("");
    setNewTemplateDesc("");
    setDialogOpen(false);
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-100 bg-background/30 p-1 rounded-2xl">
      {/* Table filters toolbar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar template..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-card/50 border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Button variant="outline" size="sm" className="border-border hover:bg-white/[0.05] text-xs h-9 font-semibold gap-1.5 w-full md:w-auto">
            <Filter className="h-3.5 w-3.5" /> Filtrar Plataforma
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-bold gap-1.5 h-9 w-full md:w-auto shadow-lg">
            <Plus className="h-3.5 w-3.5" /> Criar Template
          </Button>
        </div>
      </div>

      {/* Templates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(t => (
          <Card key={t.id} className="bg-card/80 border-border/60 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-primary/20 transition-all">
            <div className="space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <Badge className={`text-[9px] font-bold py-0.5 rounded-full ${
                  t.platform === "Facebook Ads" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {t.platform}
                </Badge>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-200 leading-tight truncate">{t.name}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-normal">{t.desc}</p>
              </div>
            </div>

            <div className="space-y-3 pt-3 mt-1 border-t border-white/[0.04]">
              <div className="text-[9px] text-muted-foreground">
                <span className="font-bold">Métricas inclusas:</span> {t.parts}
              </div>
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.03] rounded-md">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-200">Novo Template</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Defina os detalhes básicos do template de relatório.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">Nome do Template</Label>
              <Input 
                id="name" 
                value={newTemplateName} 
                onChange={e => setNewTemplateName(e.target.value)}
                placeholder="Ex: Diário Simplificado"
                className="bg-background border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform" className="text-xs font-semibold">Plataforma</Label>
              <select 
                id="platform" 
                value={newTemplatePlatform} 
                onChange={e => setNewTemplatePlatform(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl text-xs h-9 px-3 focus:outline-none focus:border-primary"
              >
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-xs font-semibold">Descrição</Label>
              <Input 
                id="desc" 
                value={newTemplateDesc} 
                onChange={e => setNewTemplateDesc(e.target.value)}
                placeholder="Ex: Resumo focado em leads"
                className="bg-background border-border/60 text-xs h-9 rounded-xl focus-visible:ring-primary/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="hover:bg-white/[0.03] text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateTemplate} className="text-xs font-bold bg-primary text-primary-foreground shadow-lg">
              Criar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
