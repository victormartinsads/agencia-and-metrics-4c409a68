import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Loader2, Trash2, Eye, FileDown, Presentation, Link2, MessageCircle, Pencil, Folder, FolderPlus, X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSavedDiagnostics, useDeleteSavedDiagnostic, SavedDiagnostic } from "@/hooks/useSavedDiagnostics";
import { groupCampaignsByFunnel, extractFunnelCode } from "@/lib/funnelGrouping";
import { DiagnosticoPresentMode } from "./DiagnosticoPresentMode";
import { toast } from "sonner";
import { exportDiagnosticoPDF } from "./exportDiagnosticoPDF";
import { AVAILABLE_METRICS, formatCustomValue, type MetricsConfig } from "@/hooks/useDiagnosticMetricsConfig";
import { SendDiagnosticWhatsAppDialog } from "./SendDiagnosticWhatsAppDialog";
import { EditSavedDiagnosticDialog } from "./EditSavedDiagnosticDialog";
import { DiagnosticoGoogleFunnelSection } from "./DiagnosticoGoogleFunnelSection";
import { DiagnosticoGoogleCampaignsSection } from "./DiagnosticoGoogleCampaignsSection";
import { formatMetricValue, aggregateCampaignMetrics } from "@/lib/metaMetrics";
import { getMetricValue } from "@/lib/metaMetricCatalog";
import { useFunnelAnalysis } from "@/hooks/useFunnelAnalysis";
import { FunnelAIInsights } from "@/components/funnel/FunnelAIInsights";
import { FunnelHealthDiagnosticPanel } from "@/components/funnel/FunnelHealthDiagnosticPanel";

interface Props {
  clientId: string;
  clientName?: string;
  currencySymbol?: string;
}

export function SavedDiagnosticsList({ clientId, clientName = "Cliente", currencySymbol = "R$" }: Props) {
  const { data: list = [], isLoading } = useSavedDiagnostics(clientId);
  const del = useDeleteSavedDiagnostic();
  const [viewing, setViewing] = useState<SavedDiagnostic | null>(null);
  const [sharing, setSharing] = useState<SavedDiagnostic | null>(null);
  const [editing, setEditing] = useState<SavedDiagnostic | null>(null);

  // Pastas customizadas
  const foldersStorageKey = `diagnostic_folders_${clientId}`;
  const itemFoldersStorageKey = `diagnostic_item_folders_${clientId}`;

  const [folders, setFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(foldersStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["Apresentação do Diagnóstico", "Reuniões", "Como estamos"];
  });

  const [itemFolders, setItemFolders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(itemFoldersStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Estado de controle de abertura de cada sanfona/pasta (fechadas por padrão)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const toggleFolderOpen = (folderName: string) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };

  const getItemFolder = (item: SavedDiagnostic): string => {
    if (itemFolders[item.id]) return itemFolders[item.id];
    
    // Categorização automática por título se o usuário não definiu manualmente
    const titleLower = item.title.toLowerCase();
    if (titleLower.includes("reunião") || titleLower.includes("reuniao")) {
      return "Reuniões";
    }
    if (titleLower.includes("como estamos")) {
      return "Como estamos";
    }
    if (titleLower.includes("apresentação") || titleLower.includes("apresentacao") || titleLower.includes("diagnóstico") || titleLower.includes("diagnostico")) {
      return "Apresentação do Diagnóstico";
    }
    return "";
  };

  const [activeFolderFilter, setActiveFolderFilter] = useState<string>("all");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.includes(name)) {
      toast.error("Já existe uma pasta com este nome.");
      return;
    }
    const next = [...folders, name];
    setFolders(next);
    try { localStorage.setItem(foldersStorageKey, JSON.stringify(next)); } catch {}
    setNewFolderName("");
    setIsCreateFolderOpen(false);
    setActiveFolderFilter(name);
    setOpenFolders(prev => ({ ...prev, [name]: true }));
    toast.success(`Pasta "${name}" criada com sucesso!`);
  };

  const handleDeleteFolder = (folderName: string) => {
    if (!confirm(`Excluir a pasta "${folderName}"? Os diagnósticos nela continuarão salvos, mas ficarão sem pasta.`)) return;
    const nextFolders = folders.filter(f => f !== folderName);
    setFolders(nextFolders);
    try { localStorage.setItem(foldersStorageKey, JSON.stringify(nextFolders)); } catch {}

    const nextItems = { ...itemFolders };
    Object.keys(nextItems).forEach(id => {
      if (nextItems[id] === folderName) delete nextItems[id];
    });
    setItemFolders(nextItems);
    try { localStorage.setItem(itemFoldersStorageKey, JSON.stringify(nextItems)); } catch {}

    if (activeFolderFilter === folderName) setActiveFolderFilter("all");
    toast.success(`Pasta "${folderName}" excluída.`);
  };

  const handleSetItemFolder = (itemId: string, folderName: string) => {
    const next = { ...itemFolders };
    if (!folderName || folderName === "none") {
      delete next[itemId];
    } else {
      next[itemId] = folderName;
    }
    setItemFolders(next);
    try { localStorage.setItem(itemFoldersStorageKey, JSON.stringify(next)); } catch {}
    toast.success("Pasta atualizada!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando diagnósticos salvos...
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
        Nenhum diagnóstico salvo ainda. Use o botão <strong>"Salvar diagnóstico"</strong> na aba Como Estamos para arquivar uma versão.
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este diagnóstico salvo? Essa ação não pode ser desfeita.")) return;
    try {
      await del.mutateAsync({ id, client_id: clientId });
      toast.success("Diagnóstico excluído");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const renderDiagnosticItem = (item: SavedDiagnostic) => {
    const created = new Date(item.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const currentFolder = getItemFolder(item);

    return (
      <div key={item.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center justify-between gap-3 hover:border-primary/30 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-card-foreground truncate">{item.title}</span>
            {currentFolder && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                <Folder className="h-3 w-3" /> {currentFolder}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {item.snapshot?.periodRange || item.date_preset} • Salvo em {created}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentFolder || "none"}
            onValueChange={(val) => handleSetItemFolder(item.id, val)}
          >
            <SelectTrigger className="h-8 text-xs border-border bg-background w-[160px]">
              <SelectValue placeholder="Mover p/ pasta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs">Sem pasta</SelectItem>
              {folders.map(f => (
                <SelectItem key={f} value={f} className="text-xs">
                  📁 {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => setViewing(item)}>
            <Eye className="h-4 w-4" /> Visualizar
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditing(item)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => {
              const path = item.slug ? `/como-estamos/${item.slug}` : `/diagnostico/${item.id}`;
              const url = `${window.location.origin}${path}`;
              navigator.clipboard.writeText(url);
              toast.success("Link público copiado!");
            }}
          >
            <Link2 className="h-4 w-4" /> Copiar link
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-[#25D366] hover:bg-[#1da851] text-white"
            onClick={() => setSharing(item)}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button size="sm" variant="ghost" className="gap-2 text-destructive" onClick={() => handleDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const filteredList = list.filter(item => {
    const itemFolder = getItemFolder(item);
    if (activeFolderFilter === "all") return true;
    if (activeFolderFilter === "none") return !itemFolder;
    return itemFolder === activeFolderFilter;
  });

  return (
    <>
      <div className="space-y-4">
        {/* Barra de Controle de Pastas */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Folder className="h-3.5 w-3.5 text-primary" /> Pastas:
            </span>
            <button
              onClick={() => setActiveFolderFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFolderFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Todas ({list.length})
            </button>
            <button
              onClick={() => {
                setActiveFolderFilter("none");
                setOpenFolders(prev => ({ ...prev, none: true }));
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFolderFilter === "none"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Sem pasta ({list.filter(i => !getItemFolder(i)).length})
            </button>

            {folders.map(folder => {
              const count = list.filter(i => getItemFolder(i) === folder).length;
              const isActive = activeFolderFilter === folder;
              return (
                <div key={folder} className="inline-flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveFolderFilter(folder);
                      setOpenFolders(prev => ({ ...prev, [folder]: true }));
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border text-card-foreground hover:bg-muted"
                    }`}
                  >
                    <Folder className="h-3 w-3" />
                    {folder}
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(folder)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="Excluir pasta"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <Button size="sm" variant="outline" onClick={() => setIsCreateFolderOpen(true)} className="gap-1.5 h-8 text-xs">
            <FolderPlus className="h-3.5 w-3.5 text-primary" /> Nova Pasta
          </Button>
        </div>

        {/* Form para Criar Pasta */}
        {isCreateFolderOpen && (
          <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-card-foreground flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-primary" /> Criar nova pasta
              </h4>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsCreateFolderOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite o nome para organizar seus diagnósticos e reuniões.
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome da pasta (ex: Reuniões de Alinhamento)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setIsCreateFolderOpen(false);
                }}
                className="h-8 text-xs flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleCreateFolder} className="h-8 text-xs gap-1">
                <Check className="h-3.5 w-3.5" /> Salvar Pasta
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Diagnósticos em modo Sanfona (Accordion por Pasta) */}
        {filteredList.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm italic">
            Nenhum diagnóstico nesta pasta.
          </div>
        ) : (
          <div className="space-y-4">
            {folders.map(folder => {
              const itemsInFolder = (activeFolderFilter === "all" || activeFolderFilter === folder)
                ? list.filter(i => getItemFolder(i) === folder)
                : [];
              if (itemsInFolder.length === 0) return null;
              const isOpen = !!openFolders[folder];

              return (
                <div key={folder} className="rounded-xl border border-border overflow-hidden bg-card transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFolderOpen(folder)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-base font-bold text-card-foreground">{folder}</span>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                        {itemsInFolder.length} {itemsInFolder.length === 1 ? "diagnóstico" : "diagnósticos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {isOpen ? "Ocultar" : "Expandir"}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-primary transition-transform duration-200 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-4 space-y-3 border-t border-border/50 bg-background/50 animate-in fade-in duration-200">
                      {itemsInFolder.map(item => renderDiagnosticItem(item))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Sem pasta */}
            {(activeFolderFilter === "all" || activeFolderFilter === "none") && list.filter(i => !getItemFolder(i)).length > 0 && (() => {
              const unassignedItems = list.filter(i => !getItemFolder(i));
              const isOpen = !!openFolders["none"];
              return (
                <div className="rounded-xl border border-border overflow-hidden bg-card transition-all">
                  <button
                    type="button"
                    onClick={() => toggleFolderOpen("none")}
                    className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left select-none cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span className="text-base font-bold text-card-foreground">Sem pasta</span>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                        {unassignedItems.length} {unassignedItems.length === 1 ? "diagnóstico" : "diagnósticos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        {isOpen ? "Ocultar" : "Expandir"}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="p-4 space-y-3 border-t border-border/50 bg-background/50 animate-in fade-in duration-200">
                      {unassignedItems.map(item => renderDiagnosticItem(item))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {viewing && (
        <SavedDiagnosticViewer
          item={viewing}
          clientName={clientName}
          currencySymbol={currencySymbol}
          onClose={() => setViewing(null)}
        />
      )}

      {sharing && (
        <SendDiagnosticWhatsAppDialog
          open={!!sharing}
          onOpenChange={(v) => !v && setSharing(null)}
          diagnosticUrl={`${window.location.origin}${sharing.slug ? `/como-estamos/${sharing.slug}` : `/diagnostico/${sharing.id}`}`}
          diagnosticTitle={sharing.title}
        />
      )}

      {editing && (
        <EditSavedDiagnosticDialog
          item={editing}
          open={!!editing}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}
    </>
  );
}

function SavedDiagnosticViewer({
  item, clientName, currencySymbol, onClose,
}: { item: SavedDiagnostic; clientName: string; currencySymbol: string; onClose: () => void }) {
  const snap = item.snapshot || {};
  const campaigns = snap.campaigns || [];
  const groups = groupCampaignsByFunnel(campaigns);
  const blocks = snap.blocks || { positives: "", negatives: "", manager_actions: "", client_requests: "" };
  const whatWeDid = snap.whatWeDid || "";
  const periodRange = snap.periodRange || item.date_preset;
  const metricsConfig: Record<string, MetricsConfig> = snap.metricsConfig || {};
  const funnelLabels = snap.funnelLabels || {};
  const [exporting, setExporting] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      await exportDiagnosticoPDF(docRef.current, `como-estamos-${item.title.replace(/\s+/g, "-")}.pdf`);
      toast.success("PDF gerado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const fmtMoney = (v: number) =>
    `${currencySymbol} ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-auto">
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b border-border bg-card/90 backdrop-blur">
        <div className="text-sm text-card-foreground font-semibold truncate">
          {item.title} <span className="text-muted-foreground font-normal">• {periodRange}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setPresenting(true)}>
            <Presentation className="h-4 w-4" /> Apresentar
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {exporting ? "Exportando..." : "Exportar PDF"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <div ref={docRef} className="max-w-5xl mx-auto p-6 space-y-6 bg-background">
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-8">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Como Estamos — {periodRange}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-card-foreground mt-2">{clientName}</h1>
        </section>

        {whatWeDid && (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-card-foreground">📝 Anotações do gestor</h3>
            <div>
              <div className="text-sm font-semibold text-primary mb-2">O que fizemos</div>
              <pre className="whitespace-pre-wrap text-sm text-card-foreground font-sans leading-relaxed">{whatWeDid}</pre>
            </div>
          </section>
        )}

        {snap.googleAnalytics && (
          <div className="space-y-4">
            <DiagnosticoGoogleFunnelSection gaData={snap.googleAnalytics} />
          </div>
        )}

        {snap.googleAdsCampaigns && snap.googleAdsCampaigns.length > 0 && (
          <div className="space-y-4">
            <DiagnosticoGoogleCampaignsSection
              campaigns={snap.googleAdsCampaigns}
              currencySymbol={currencySymbol}
              groupConfigs={metricsConfig}
              funnelLabels={funnelLabels}
            />
          </div>
        )}

        {groups.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-card-foreground">📊 Funis e campanhas</h3>
            {groups.map(g => {
              const { classified, metrics, totalSpend, totalPurchaseValue } = useFunnelAnalysis(g.campaigns);
              const totals = aggregateCampaignMetrics(g.campaigns);
              
              const resultLabel = g.campaigns.find(c => (c as any).primaryResultLabel)?.primaryResultLabel || "Resultados";
              const cfg = metricsConfig[g.key];
              
              const getMetricValueAndOverride = (key: string) => {
                const override = cfg?.custom_metrics?.find((m) => m.id === key);
                const isOverridden = !!override;
                const originalRaw = getMetricValue(totals, key);
                const rawValue = isOverridden ? Number(String(override.value).replace(",", ".")) : originalRaw;
                const value = isOverridden
                  ? (override.format === "text" ? override.value : formatMetricValue(key, rawValue, currencySymbol))
                  : formatMetricValue(key, originalRaw, currencySymbol);
                return { value, isOverridden };
              };

              const getCurrentRawValue = (key: string) => {
                const override = cfg?.custom_metrics?.find((m) => m.id === key);
                if (override) return Number(String(override.value).replace(",", "."));
                return getMetricValue(totals, key);
              };

              const labelOf = (key: string) => key === "conversions" ? resultLabel : (AVAILABLE_METRICS.find(m => m.key === key)?.label || key);
              const customGroupTitle = (() => {
                if (g.isFunnel) {
                  const code = extractFunnelCode(g.campaigns[0]?.name);
                  return (code && funnelLabels[code]) || g.key;
                } else {
                  const campaignId = g.campaigns[0]?.id;
                  return (campaignId && funnelLabels[campaignId]) || g.key;
                }
              })();

              return (
                <div key={g.key} className="rounded-xl border border-border bg-card p-5">
                  <h4 className="text-base font-bold text-card-foreground">
                    {g.isFunnel ? `Funil: ${customGroupTitle}` : customGroupTitle}
                  </h4>
                  {cfg ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                      {cfg.visible_metrics.map(k => (
                        <Mini key={k} label={labelOf(k)} value={getMetricValueAndOverride(k).value} />
                      ))}
                      {cfg.custom_metrics
                        .filter(m => !AVAILABLE_METRICS.some(am => am.key === m.id))
                        .map(m => (
                          <Mini key={m.id} label={`✦ ${m.label}`} value={formatCustomValue(m, currencySymbol)} />
                        ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <Mini label="Investimento" value={getMetricValueAndOverride("spend").value} />
                      <Mini label={resultLabel} value={getMetricValueAndOverride("conversions").value} />
                      <Mini label="CPA" value={getMetricValueAndOverride("cpa").value} />
                      <Mini label="CTR" value={getMetricValueAndOverride("ctr").value} />
                    </div>
                  )}

                  {/* Funnel Health & Diagnostics */}
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <FunnelHealthDiagnosticPanel
                      clientId=""
                      funnelCode={g.isFunnel ? (extractFunnelCode(g.campaigns[0]?.name) || g.key) : (g.campaigns[0]?.id || g.key)}
                      readOnly={true}
                      snapshotData={snap.funnelDiagnostics?.[g.isFunnel ? (extractFunnelCode(g.campaigns[0]?.name) || g.key) : (g.campaigns[0]?.id || g.key)]}
                      liveCampaignMetrics={{
                        hookRate: getCurrentRawValue("hookRate"),
                        holdRate: getCurrentRawValue("holdRate"),
                        linkCtr: getCurrentRawValue("linkCtr"),
                        avgVideoTime: getCurrentRawValue("avgVideoTime"),
                        costPerPlay: (getCurrentRawValue("videoPlays") || getCurrentRawValue("thruplays")) > 0
                          ? getCurrentRawValue("spend") / (getCurrentRawValue("videoPlays") || getCurrentRawValue("thruplays"))
                          : 0,
                      }}
                    />
                  </div>

                  <div className="print:hidden mt-6">
                    <FunnelAIInsights 
                      campaigns={classified}
                      metrics={metrics}
                      totalSpend={totalSpend}
                      totalPurchaseValue={totalPurchaseValue}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-xl font-bold text-card-foreground">🎯 Diagnóstico Final</h3>
          <div className="max-w-3xl">
            <Block title="Pedidos ao cliente" emoji="🤝" accent="border-amber-500/30 bg-amber-500/5" value={blocks.client_requests} />
          </div>
        </section>
      </div>

      {presenting && (
        <DiagnosticoPresentMode
          clientName={clientName}
          datePreset={periodRange}
          periodRange={periodRange}
          groups={groups}
          blocks={blocks}
          whatWeDid={whatWeDid}
          nextActions=""
          currencySymbol={currencySymbol}
          onClose={() => setPresenting(false)}
          groupConfigs={metricsConfig}
          funnelLabels={funnelLabels}
          googleAnalyticsData={snap.googleAnalytics}
          googleAdsCampaigns={snap.googleAdsCampaigns}
          funnelDiagnostics={snap.funnelDiagnostics}
        />
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-bold text-card-foreground">{value}</div>
    </div>
  );
}

function Block({ title, emoji, accent, value }: { title: string; emoji: string; accent: string; value: string }) {
  const empty = !value?.trim();
  return (
    <div className={`rounded-xl border ${accent} p-5 space-y-2`}>
      <h4 className="text-base font-bold text-card-foreground flex items-center gap-2">
        <span className="text-xl">{emoji}</span> {title}
      </h4>
      {empty ? (
        <p className="text-sm text-muted-foreground italic">Sem conteúdo neste bloco.</p>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none text-card-foreground prose-p:my-2 prose-li:my-1">
          <ReactMarkdown remarkPlugins={[remarkBreaks]}>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}