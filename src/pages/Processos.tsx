import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  GitMerge,
  AlertTriangle,
  FileText,
  X,
  PlusCircle,
  HelpCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProcesses, useUpsertProcess, useDeleteProcess, ProcessCard } from "@/hooks/useProcesses";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import * as locales from "@blocknote/core/locales";

// Custom BlockNote Editor Component for Process Subpage
function ProcessEditor({ initialContent, onSave }: { initialContent: any; onSave: (content: any) => void }) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const options = {
    initialContent: (initialContent && initialContent.length > 0)
      ? initialContent
      : [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Escreva aqui a descrição detalhada deste processo operacional...", styles: { italic: true } }]
          }
        ],
    dictionary: locales.pt
  };
  const editor = useCreateBlockNote(options);

  const handleChange = () => {
    if (!editor) return;
    onSave(editor.document);
  };

  // Intercept clicks on internal /processos/pagina/ links
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('/processos/pagina/')) {
        e.preventDefault();
        navigate(href);
      }
    };

    wrapper.addEventListener('click', handleClick, true);
    return () => wrapper.removeEventListener('click', handleClick, true);
  }, [navigate]);

  return (
    <div className="blocknote-editor-wrapper text-sm" ref={wrapperRef}>
      <BlockNoteView
        editor={editor}
        editable={true}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}

export default function ProcessosPage() {
  const navigate = useNavigate();
  const { data: processes = [], isLoading } = useProcesses();
  const upsertProcess = useUpsertProcess();
  const deleteProcess = useDeleteProcess();

  // Active Dialog Process
  const [selectedProcess, setSelectedProcess] = useState<ProcessCard | null>(null);

  // New process states
  const [newProcessOpen, setNewProcessOpen] = useState(false);
  const [newProcessName, setNewProcessName] = useState("");
  const [newProcessColumn, setNewProcessColumn] = useState<"PRE_VENDA" | "CLIENTE_ATIVO" | "CONTROLE">("PRE_VENDA");
  const [newProcessIcon, setNewProcessIcon] = useState<"logo" | "cyclone" | "stop" | "cross">("logo");

  // Filter columns
  const preVendaItems = useMemo(() => processes.filter(p => p.column_name === "PRE_VENDA"), [processes]);
  const clienteAtivoItems = useMemo(() => processes.filter(p => p.column_name === "CLIENTE_ATIVO"), [processes]);
  const controleItems = useMemo(() => processes.filter(p => p.column_name === "CONTROLE"), [processes]);

  // Handle adding new process
  const handleCreateProcess = async () => {
    if (!newProcessName.trim()) {
      toast.error("Nome do processo é obrigatório");
      return;
    }

    const orderIndex = processes.filter(p => p.column_name === newProcessColumn).length;
    const newCard: ProcessCard = {
      id: Math.random().toString(36).substring(2, 11),
      name: newProcessName.trim(),
      column_name: newProcessColumn,
      icon_type: newProcessIcon,
      order_index: orderIndex,
      content: [
        {
          type: "heading",
          props: { level: 2 },
          content: [{ type: "text", text: `📋 Processo: ${newProcessName.trim()}`, styles: { bold: true } }]
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Espaço destinado à documentação e acompanhamento detalhado desta etapa.", styles: { italic: true } }]
        }
      ]
    };

    await upsertProcess.mutateAsync(newCard);
    toast.success("Processo criado com sucesso!");
    setNewProcessName("");
    setNewProcessOpen(false);
  };

  // Icon renderer helper
  const renderIcon = (type: "logo" | "cyclone" | "stop" | "cross") => {
    switch (type) {
      case "logo":
        return (
          <div className="h-4 w-4 bg-[#7a9d96]/20 border border-[#7a9d96]/40 text-[#7a9d96] text-[8px] font-bold flex items-center justify-center rounded-full shrink-0 select-none font-mono">
            AND
          </div>
        );
      case "cyclone":
        return <span className="text-xs shrink-0 select-none">🌀</span>;
      case "stop":
        return <span className="text-xs shrink-0 select-none">🛑</span>;
      case "cross":
        return <span className="text-xs shrink-0 select-none">❌</span>;
      default:
        return <HelpCircle className="h-3.5 w-3.5 text-[#9b9a97] shrink-0" />;
    }
  };

  // Column labels
  const columnsInfo = [
    { key: "PRE_VENDA", label: "PRÉ VENDA", items: preVendaItems, bg: "bg-[#7a9d96]/10 border-[#7a9d96]/30 text-[#7a9d96]" },
    { key: "CLIENTE_ATIVO", label: "CLIENTE ATIVO", items: clienteAtivoItems, bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
    { key: "CONTROLE", label: "CONTROLE", items: controleItems, bg: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  ];

  if (selectedProcess) {
    return (
      <AppShell currentPage="notion" header={null} noContainer>
        <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-24 selection:bg-[#2c2c2b]">
          
          {/* Notion-style Top Navigation Bar */}
          <div className="sticky top-0 bg-[#191919]/95 backdrop-blur-sm z-30 border-b border-[#2c2c2b]/30 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedProcess(null)}
                className="flex items-center gap-1.5 text-xs text-[#9b9a97] hover:text-[#e3e2e0] transition-colors p-1 rounded hover:bg-[#2c2c2b] font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Processos</span>
              </button>
              <span className="text-[#5f5e5b] text-xs">/</span>
              <span className="text-xs text-[#e3e2e0] font-semibold flex items-center gap-1.5">
                {selectedProcess.icon_type === "logo" && "🟢"}
                {selectedProcess.icon_type === "cyclone" && "🌀"}
                {selectedProcess.icon_type === "stop" && "🛑"}
                {selectedProcess.icon_type === "cross" && "❌"}
                <span>{selectedProcess.name}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (confirm(`Excluir permanentemente o processo "${selectedProcess.name}"?`)) {
                    await deleteProcess.mutateAsync(selectedProcess.id);
                    toast.success("Processo excluído");
                    setSelectedProcess(null);
                  }
                }}
                className="h-7 text-xs bg-red-950/20 hover:bg-red-900 border border-red-900 text-red-400 hover:text-white px-2.5 rounded-[4px] font-bold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir Página
              </Button>
              <Button
                onClick={() => setSelectedProcess(null)}
                className="h-7 text-xs bg-[#7a9d96] hover:bg-[#7a9d96]/90 text-[#191919] font-bold px-3.5 rounded-[4px]"
              >
                Voltar
              </Button>
            </div>
          </div>

          {/* Cover Banner (Dark industrial style) */}
          <div className="h-44 md:h-52 w-full relative overflow-hidden border-b border-[#2c2c2b]">
            <img
              src="https://images.unsplash.com/photo-1560563609-3b4b1f5c2122?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=6000"
              alt="Cover"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#191919] via-[#191919]/20 to-transparent" />
            <div className="absolute -bottom-6 left-16 md:left-24 h-16 w-16 bg-[#7a9d96]/10 border-2 border-[#7a9d96] flex items-center justify-center rounded-full shadow-lg">
              <GitMerge className="h-8 w-8 text-[#7a9d96]" />
            </div>
          </div>

          {/* Notion Page Container */}
          <div className="max-w-4xl mx-auto px-6 md:px-16 pt-12 space-y-6">
            
            {/* Title Input */}
            <div className="space-y-1">
              <input
                type="text"
                value={selectedProcess.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedProcess(p => p ? { ...p, name: val } : null);
                }}
                onBlur={() => {
                  if (selectedProcess.name.trim()) {
                    upsertProcess.mutate(selectedProcess);
                  }
                }}
                className="w-full bg-transparent border-none text-4xl font-bold text-white focus:ring-0 outline-none p-0 focus:border-none focus:outline-none tracking-tight"
                placeholder="Sem título"
              />
            </div>

            {/* Properties Panel (Notion-style Metadata Grid) */}
            <div className="space-y-2 pt-2 pb-4 border-b border-[#2c2c2b]/30 max-w-xl">
              
              {/* Column/Group Property */}
              <div className="flex items-center text-xs">
                <div className="w-36 text-[#9b9a97] font-medium flex items-center gap-1.5 select-none">
                  <span>📂</span> Coluna / Grupo
                </div>
                <Select
                  value={selectedProcess.column_name}
                  onValueChange={(val: any) => {
                    const updated = { ...selectedProcess, column_name: val };
                    setSelectedProcess(updated);
                    upsertProcess.mutate(updated);
                    toast.success(`Movido para ${val.replace("_", " ")}`);
                  }}
                >
                  <SelectTrigger className="h-7 bg-transparent border-none text-[#e3e2e0] hover:bg-[#252525] focus:ring-0 rounded px-1.5 font-medium py-0 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                    <SelectItem value="PRE_VENDA">PRÉ VENDA</SelectItem>
                    <SelectItem value="CLIENTE_ATIVO">CLIENTE ATIVO</SelectItem>
                    <SelectItem value="CONTROLE">CONTROLE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Icon / Status Property */}
              <div className="flex items-center text-xs">
                <div className="w-36 text-[#9b9a97] font-medium flex items-center gap-1.5 select-none">
                  <span>✨</span> Ícone / Status
                </div>
                <Select
                  value={selectedProcess.icon_type}
                  onValueChange={(val: any) => {
                    const updated = { ...selectedProcess, icon_type: val };
                    setSelectedProcess(updated);
                    upsertProcess.mutate(updated);
                  }}
                >
                  <SelectTrigger className="h-7 bg-transparent border-none text-[#e3e2e0] hover:bg-[#252525] focus:ring-0 rounded px-1.5 font-medium py-0 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                    <SelectItem value="logo">AND Logo 🟢</SelectItem>
                    <SelectItem value="cyclone">Cyclone 🌀</SelectItem>
                    <SelectItem value="stop">Pausado 🛑</SelectItem>
                    <SelectItem value="cross">Desativado ❌</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* BlockNote Document Editor */}
            <div className="blocknote-editor-wrapper pt-2">
              <ProcessEditor
                key={selectedProcess.id}
                initialContent={selectedProcess.content}
                onSave={(content) => {
                  const updated = { ...selectedProcess, content };
                  setSelectedProcess(p => p ? { ...p, content } : null);
                  upsertProcess.mutate(updated);
                }}
              />
            </div>

          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPage="notion" header={null} noContainer>
      <div className="min-h-screen bg-[#191919] text-[#e3e2e0] font-sans pb-16 selection:bg-[#2c2c2b]">
        
        {/* Cover Banner (Dark industrial style) */}
        <div className="h-44 md:h-52 w-full relative overflow-hidden border-b border-[#2c2c2b]">
          <img
            src="https://images.unsplash.com/photo-1560563609-3b4b1f5c2122?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=6000"
            alt="Cover"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#191919] via-[#191919]/20 to-transparent" />
          <div className="absolute -bottom-6 left-16 md:left-24 h-16 w-16 bg-[#7a9d96]/10 border-2 border-[#7a9d96] flex items-center justify-center rounded-full shadow-lg">
            <GitMerge className="h-8 w-8 text-[#7a9d96]" />
          </div>
        </div>

        {/* Notion Header */}
        <div className="max-w-6xl mx-auto px-16 pt-10 space-y-3">
          <div className="flex items-center gap-1 text-[11px] text-[#9b9a97] font-semibold">
            <span>DASHBOARD | AND</span>
            <span>/</span>
            <span className="text-[#e3e2e0]">PROCESSOS</span>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-[#e3e2e0]">PROCESSOS</h1>
          <p className="text-xs text-[#7a9d96] italic">
            Espaço destinado à padronização de todos os processos.
          </p>

          <div className="border-b border-[#2c2c2b] pt-4" />
        </div>

        {/* Board Database */}
        <div className="max-w-6xl mx-auto px-16 mt-6">
          
          {/* Linked Database Callout container */}
          <div className="bg-[#202020] border border-[#2c2c2b] rounded-[6px] p-5 space-y-4 shadow-sm">
            
            {/* Callout Header */}
            <div className="flex items-center justify-between border-b border-[#2c2c2b]/40 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#e3e2e0]">
                <GitMerge className="h-4 w-4 text-[#7a9d96]" />
                <span>VISUALIZAÇÃO</span>
              </div>
              
              <Button
                onClick={() => setNewProcessOpen(true)}
                className="h-7 text-xs bg-[#7a9d96] hover:bg-[#7a9d96]/95 text-[#191919] font-bold px-3 gap-1 rounded-[4px]"
              >
                <Plus className="h-3 w-3" /> Novo Processo
              </Button>
            </div>

            {/* Kanban columns */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#7a9d96]" />
                <span className="text-xs text-[#9b9a97]">Carregando processos...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-1">
                {columnsInfo.map((col) => (
                  <div key={col.key} className="space-y-3">
                    
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border ${col.bg} font-mono tracking-wide`}>
                          {col.label}
                        </span>
                        <span className="text-[10px] text-[#5f5e5b] font-bold font-mono">{col.items.length}</span>
                      </div>
                      <button
                        onClick={() => {
                          setNewProcessColumn(col.key as any);
                          setNewProcessOpen(true);
                        }}
                        className="text-[#5f5e5b] hover:text-[#9b9a97] transition-colors p-0.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Card List */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                      {col.items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setSelectedProcess(item)}
                          className="bg-[#262625] border border-[#2c2c2b]/80 rounded-[6px] p-3 hover:bg-[#2c2c2b] transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {renderIcon(item.icon_type)}
                            <span className="text-xs font-semibold text-[#e3e2e0] truncate group-hover:text-[#7a9d96] transition-colors">
                              {item.name}
                            </span>
                          </div>
                          
                          <Eye className="h-3 w-3 text-[#5f5e5b] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}

                      {col.items.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-[#2c2c2b] rounded-[6px] text-[10px] text-[#5f5e5b]">
                          Sem processos neste grupo
                        </div>
                      )}
                    </div>

                    {/* Column Footer Button */}
                    <button
                      onClick={() => {
                        setNewProcessColumn(col.key as any);
                        setNewProcessOpen(true);
                      }}
                      className="w-full py-1.5 flex items-center justify-center gap-1 text-[10px] text-[#5f5e5b] hover:text-[#9b9a97] hover:bg-[#262625]/40 rounded-[4px] border border-transparent hover:border-[#2c2c2b]/50 transition-all font-semibold uppercase tracking-wider"
                    >
                      <Plus className="h-3 w-3" />
                      Nova página
                    </button>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Bottom Warning/Callout */}
          <div className="border-t border-[#2c2c2b]/40 my-6 pt-6">
            <div className="bg-[#202020] border-l-4 border-yellow-500/80 bg-opacity-40 p-4 rounded-r-[6px] flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-xs text-[#e3e2e0] leading-relaxed font-semibold">
                Elencar o tempo necessário e responsável por cada uma das etapas.
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Dialog for creating a new process card */}
      <Dialog open={newProcessOpen} onOpenChange={setNewProcessOpen}>
        <DialogContent className="bg-[#191919] border-[#2c2c2b] text-[#e3e2e0] max-w-sm rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-1.5">
              <PlusCircle className="h-4 w-4 text-[#7a9d96]" /> Novo Processo
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Nome do Processo*</Label>
              <Input
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                placeholder="Ex: ONBOARDING DE CLIENTE"
                className="h-8 text-xs bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] placeholder:text-[#5f5e5b] focus-visible:ring-0 focus-visible:border-[#7a9d96] rounded-[4px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Grupo / Coluna</Label>
              <Select
                value={newProcessColumn}
                onValueChange={(val: any) => setNewProcessColumn(val)}
              >
                <SelectTrigger className="h-8 bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus:ring-0 rounded-[4px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                  <SelectItem value="PRE_VENDA">PRÉ VENDA</SelectItem>
                  <SelectItem value="CLIENTE_ATIVO">CLIENTE ATIVO</SelectItem>
                  <SelectItem value="CONTROLE">CONTROLE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-[#9b9a97] uppercase font-bold">Ícone do Status</Label>
              <Select
                value={newProcessIcon}
                onValueChange={(val: any) => setNewProcessIcon(val)}
              >
                <SelectTrigger className="h-8 bg-[#202020] border-[#2c2c2b] text-[#e3e2e0] focus:ring-0 rounded-[4px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#202020] border-[#2c2c2b] text-[#e3e2e0]">
                  <SelectItem value="logo">AND Logo 🟢</SelectItem>
                  <SelectItem value="cyclone">Cyclone 🌀</SelectItem>
                  <SelectItem value="stop">Pausado 🛑</SelectItem>
                  <SelectItem value="cross">Desativado ❌</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreateProcess}
              className="bg-[#7a9d96] hover:bg-[#7a9d96]/90 text-[#191919] font-bold text-xs uppercase h-8 px-5 rounded-[4px]"
            >
              Criar Página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
