import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, 
  Pause, 
  Play, 
  DollarSign, 
  AlertCircle, 
  TrendingDown, 
  Pencil, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  Image as ImageIcon, 
  Info, 
  RotateCw, 
  Plus, 
  Zap,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ObjectEditDrawer } from "./ObjectEditDrawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  campaignId: string;
  campaignName: string;
  datePreset: string;
  currencySymbol?: string;
}

function num(n: any) { return Number(n || 0); }
function fmtMoney(v: any, c = "R$") { return `${c} ${num(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtNum(v: any) { return num(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }); }
function fmtPct(v: any) { return `${num(v).toFixed(2)}%`; }
function getAction(actions: any[] | undefined, type: string) {
  return Number(actions?.find((a) => a.action_type === type)?.value || 0);
}

// Custom Toggle Switch styled exactly like AdsDaily (Lime green active background, black thumb)
function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-primary" : "bg-zinc-800"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out mt-[0.5px] ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function CampaignDrillDown({ open, onOpenChange, clientId, campaignId, campaignName, datePreset, currencySymbol = "R$" }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ level: "campaign" | "adset" | "ad"; obj: any } | null>(null);
  const [campaignExpanded, setCampaignExpanded] = useState(true);
  const [expandedAdsets, setExpandedAdsets] = useState<Record<string, boolean>>({});
  const [showHidden, setShowHidden] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["meta-ads-detail", clientId, campaignId, datePreset],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-ads-detail", {
        body: { clientId, campaignId, datePreset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { campaign: any; adsets: any[]; ads: any[] };
    },
    enabled: open && !!clientId && !!campaignId,
    staleTime: 60_000,
  });

  const camp = data?.campaign;
  const ci = camp?.insights?.data?.[0];
  const adsets = data?.adsets || [];
  const ads = data?.ads || [];

  // Group ads by adset
  const adsByAdset = useMemo(() => {
    const map: Record<string, any[]> = {};
    ads.forEach(ad => {
      const adsetId = ad.adset_id || ad.adset?.id;
      if (adsetId) {
        if (!map[adsetId]) map[adsetId] = [];
        map[adsetId].push(ad);
      }
    });
    return map;
  }, [ads]);

  const toggleAdset = (id: string) => {
    setExpandedAdsets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const doAction = async (level: "campaign" | "adset" | "ad", objectId: string, action: "pause" | "activate" | "set_daily_budget", value?: number) => {
    const loadingToast = toast.loading("Aplicando ação no Meta...");
    try {
      const { data, error } = await supabase.functions.invoke("meta-ads-action", {
        body: { clientId, level, objectId, action, value },
      });
      toast.dismiss(loadingToast);
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error, { description: data.hint });
        return;
      }
      toast.success("Ação aplicada com sucesso!");
      qc.invalidateQueries({ queryKey: ["meta-ads", clientId] });
      refetch();
    } catch (e: any) {
      toast.dismiss(loadingToast);
      toast.error(e?.message || "Falha ao executar ação");
    }
  };

  // Top metric card sums
  const totalSpend = useMemo(() => num(ci?.spend), [ci]);
  const totalImpressions = useMemo(() => num(ci?.impressions), [ci]);
  const totalReach = useMemo(() => num(ci?.reach) || num(ci?.clicks) || 0, [ci]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[92vh] flex flex-col overflow-hidden bg-background border border-border/40 rounded-2xl text-slate-100 p-0 shadow-2xl">
        {/* Header Section */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-card/40 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center shrink-0">
              <span className="text-sm text-[#1877f2] font-black">∞</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-slate-200 truncate uppercase tracking-tight">
                {campaignName}
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">
                Visão editor · Atualizado recentemente
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" className="h-8 text-xs font-bold bg-white/5 border border-border/40 rounded-xl">
              Últimos 7 dias
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-border/40 rounded-xl h-8">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ocultos</span>
              <ToggleSwitch checked={showHidden} onChange={() => setShowHidden(!showHidden)} />
            </div>
            <Button size="sm" onClick={() => refetch()} variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5 rounded-xl border border-border/40">
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Obtendo dados de veiculação do Meta Ads...</span>
            </div>
          )}

          {!isLoading && camp && (
            <>
              {/* Three Metrics Cards at the Top */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card border border-border/40 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs text-[#858580] font-black">$</span>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Investimento Total</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-2 tracking-tight">
                    {fmtMoney(totalSpend, currencySymbol)}
                  </h3>
                </Card>

                <Card className="bg-card border border-border/40 p-5 rounded-2xl flex flex-col justify-between shadow-xl">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5 text-[#858580]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Impressões Totais</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-2 tracking-tight">
                    {fmtNum(totalImpressions)}
                  </h3>
                </Card>

                <Card className="bg-card border border-border/40 p-5 rounded-2xl flex flex-col justify-between shadow-xl relative">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-3.5 w-3.5 text-[#858580]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Alcance Total</span>
                    <Info className="h-3 w-3 text-muted-foreground/40 absolute top-5 right-5 cursor-help" />
                  </div>
                  <h3 className="text-2xl font-black text-white mt-2 tracking-tight">
                    {fmtNum(totalReach)}
                  </h3>
                </Card>
              </div>

              {/* Collapsible Hierarchy Tree List */}
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/30">
                {/* Campaign Row */}
                <div className="flex items-center justify-between p-4 bg-card/60 border-b border-border/40 select-none">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                      onClick={() => setCampaignExpanded(!campaignExpanded)} 
                      className="p-1 hover:bg-white/5 rounded text-muted-foreground"
                    >
                      {campaignExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <ToggleSwitch 
                      checked={camp.status === "ACTIVE"} 
                      onChange={() => doAction("campaign", campaignId, camp.status === "ACTIVE" ? "pause" : "activate")} 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white uppercase tracking-tight truncate">{camp.name}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 hover:bg-white/5 rounded-md"
                          onClick={() => setEditing({ level: "campaign", obj: { id: campaignId, ...camp } })}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{ads.length} anúncios</span>
                        <Badge 
                          variant="outline" 
                          className="text-[9px] font-bold px-1.5 py-0.2 cursor-pointer bg-primary/10 border-primary/20 text-primary"
                          onClick={() => setEditing({ level: "campaign", obj: { id: campaignId, ...camp } })}
                        >
                          CBO {fmtMoney(num(camp.daily_budget) / 100, currencySymbol)}/dia
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Right-side Metrics */}
                  <div className="flex items-center gap-8 text-right pr-4 shrink-0">
                    <div>
                      <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Visualizações de Perfil</div>
                      <div className="inline-flex items-center justify-center bg-primary/10 border border-primary/20 text-primary font-bold px-2 py-0.5 rounded-md text-xs font-mono">
                        {fmtNum(totalReach)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">CPR</div>
                      <div className="text-xs font-black text-white font-mono">{fmtMoney(ci?.cpc || 0, currencySymbol)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Investimento</div>
                      <div className="text-xs font-black text-primary font-mono">{fmtMoney(totalSpend, currencySymbol)}</div>
                    </div>
                  </div>
                </div>

                {/* Sub-Rows Wrapper */}
                {campaignExpanded && (
                  <div>
                    {/* Columns headers */}
                    <div className="grid grid-cols-12 gap-3 px-6 py-2.5 bg-card/25 border-b border-border/20 text-[9px] font-black uppercase text-muted-foreground/80 tracking-widest">
                      <div className="col-span-5 pl-10">Conjunto / Anúncio</div>
                      <div className="col-span-2 text-center">Visualizações</div>
                      <div className="col-span-1 text-right">CPR</div>
                      <div className="col-span-1 text-right">Impr.</div>
                      <div className="col-span-1 text-right">Alc.</div>
                      <div className="col-span-1 text-right">Cliq.</div>
                      <div className="col-span-1 text-right">CPC</div>
                    </div>

                    {/* Loop Adsets */}
                    {adsets.map((adset) => {
                      const isAdsetExpanded = expandedAdsets[adset.id] !== false; // Default expanded
                      const adsetIns = adset.insights?.data?.[0] || {};
                      const adsetSpend = num(adsetIns.spend);
                      const adsetImpressions = num(adsetIns.impressions);
                      const adsetReach = num(adsetIns.reach) || num(adsetIns.clicks) || 0;
                      const adsetClicks = num(adsetIns.clicks);
                      const adsetCPC = num(adsetIns.cpc);
                      const adsetCPR = num(adsetIns.cpc); // Fallback CPR

                      const adsetAds = adsByAdset[adset.id] || [];

                      return (
                        <div key={adset.id} className="border-b border-border/20 last:border-0">
                          {/* Adset Row */}
                          <div className="grid grid-cols-12 gap-3 px-6 py-3.5 bg-card/10 hover:bg-white/[0.01] items-center border-b border-border/10">
                            {/* Adset Title & Controls */}
                            <div className="col-span-5 flex items-center gap-3 min-w-0">
                              <button 
                                onClick={() => toggleAdset(adset.id)} 
                                className="p-1 hover:bg-white/5 rounded text-muted-foreground shrink-0"
                              >
                                {isAdsetExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                              <ToggleSwitch 
                                checked={adset.status === "ACTIVE"} 
                                onChange={() => doAction("adset", adset.id, adset.status === "ACTIVE" ? "pause" : "activate")} 
                              />
                              <div className="min-w-0 flex-1 flex items-center gap-2">
                                <span className="text-xs font-black text-slate-200 uppercase tracking-tight truncate" title={adset.name}>
                                  {adset.name}
                                </span>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-5 w-5 p-0 hover:bg-white/5 rounded"
                                  onClick={() => setEditing({ level: "adset", obj: adset })}
                                >
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                                <Target className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              </div>
                            </div>

                            {/* Adset Metrics Columns */}
                            <div className="col-span-2 text-center">
                              <span className="inline-flex items-center justify-center bg-primary/5 border border-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-md text-[10px] font-mono">
                                {fmtNum(adsetReach)}
                              </span>
                            </div>
                            <div className="col-span-1 text-right font-black text-white font-mono text-[11px]">{fmtMoney(adsetCPR, currencySymbol)}</div>
                            <div className="col-span-1 text-right font-medium text-slate-300 font-mono text-[11px]">{fmtNum(adsetImpressions)}</div>
                            <div className="col-span-1 text-right font-medium text-slate-300 font-mono text-[11px]">{fmtNum(adsetReach)}</div>
                            <div className="col-span-1 text-right font-medium text-slate-300 font-mono text-[11px]">{fmtNum(adsetClicks)}</div>
                            <div className="col-span-1 text-right font-black text-white font-mono text-[11px]">{fmtMoney(adsetCPC, currencySymbol)}</div>
                          </div>

                          {/* Ads Loop */}
                          {isAdsetExpanded && (
                            <div className="bg-black/10 py-1 pl-10 pr-2 space-y-1">
                              {adsetAds.map((ad) => {
                                const adIns = ad.insights?.data?.[0] || {};
                                const adSpend = num(adIns.spend);
                                const adImpressions = num(adIns.impressions);
                                const adReach = num(adIns.reach) || num(adIns.clicks) || 0;
                                const adClicks = num(adIns.clicks);
                                const adCPC = num(adIns.cpc);
                                const adCPR = num(adIns.cpc);

                                return (
                                  <div key={ad.id} className="grid grid-cols-12 gap-3 px-6 py-2.5 hover:bg-white/[0.02] items-center rounded-xl transition-all duration-200">
                                    {/* Ad Title & Image Thumbnail */}
                                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                                      <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-primary/30 shadow-md relative group-hover:border-primary transition-colors">
                                        {ad.creative?.thumbnail_url || ad.creative?.image_url || ad.image_url ? (
                                          <img src={ad.creative?.thumbnail_url || ad.creative?.image_url || ad.image_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <div className="h-full w-full bg-white/5 flex items-center justify-center text-muted-foreground">
                                            <ImageIcon className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                      <ToggleSwitch 
                                        checked={ad.status === "ACTIVE"} 
                                        onChange={() => doAction("ad", ad.id, ad.status === "ACTIVE" ? "pause" : "activate")} 
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[11px] font-bold text-slate-200 truncate uppercase tracking-tight" title={ad.name}>
                                            {ad.name}
                                          </span>
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-4 w-4 p-0 hover:bg-white/5 rounded"
                                            onClick={() => setEditing({ level: "ad", obj: ad })}
                                          >
                                            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                                          </Button>
                                        </div>
                                        <p className="text-[8px] font-mono text-muted-foreground mt-0.5 truncate">
                                          ID: {ad.id}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Ad Metrics Columns */}
                                    <div className="col-span-2 text-center">
                                      <span className="inline-flex items-center justify-center bg-primary/5 border border-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-md text-[10px] font-mono">
                                        {fmtNum(adReach)}
                                      </span>
                                    </div>
                                    <div className="col-span-1 text-right font-black text-white font-mono text-[10px]">{fmtMoney(adCPR, currencySymbol)}</div>
                                    <div className="col-span-1 text-right font-medium text-slate-400 font-mono text-[10px]">{fmtNum(adImpressions)}</div>
                                    <div className="col-span-1 text-right font-medium text-slate-400 font-mono text-[10px]">{fmtNum(adReach)}</div>
                                    <div className="col-span-1 text-right font-medium text-slate-400 font-mono text-[10px]">{fmtNum(adClicks)}</div>
                                    <div className="col-span-1 text-right font-black text-white font-mono text-[10px]">{fmtMoney(adCPC, currencySymbol)}</div>
                                  </div>
                                );
                              })}

                              {/* Dash-bordered "+ Adicionar novo criativo" button */}
                              <div className="px-6 py-2">
                                <button className="w-full py-2.5 border border-dashed border-border/40 hover:border-primary/40 rounded-xl text-center text-[10px] font-bold text-muted-foreground hover:text-white transition-all cursor-pointer bg-white/[0.01]">
                                  + Adicionar novo criativo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Bottom Status Info Bar */}
        <div className="h-10 border-t border-border/40 px-6 flex items-center bg-card/20 text-[10px] text-muted-foreground justify-between">
          <div>
            Nenhum conjunto oculto · Filtros ativos padrão do Meta Ads
          </div>
          <div className="flex items-center gap-1">
            Precisa de ajuda? <HelpCircle className="h-3 w-3 text-muted-foreground/60 cursor-help" />
          </div>
        </div>

        {/* Floating Action Button (FAB) lightning bolt */}
        <button className="absolute bottom-14 right-6 h-12 w-12 bg-primary hover:scale-105 active:scale-95 transition-all rounded-full flex items-center justify-center text-zinc-950 font-black shadow-[0_8px_32px_rgba(200,249,2,0.3)] cursor-pointer group z-50">
          <Zap className="h-5 w-5 fill-zinc-950 text-zinc-950 shrink-0" />
        </button>

        {/* Editing drawer */}
        <ObjectEditDrawer
          open={!!editing}
          onOpenChange={(v) => { if (!v) setEditing(null); }}
          level={editing?.level || "adset"}
          clientId={clientId}
          object={editing?.obj || null}
          onSaved={() => { refetch(); qc.invalidateQueries({ queryKey: ["meta-ads", clientId] }); }}
        />
      </DialogContent>
    </Dialog>
  );
}

function BudgetEditor({ current, onSave, currencySymbol = "R$", compact = false }: { current: number; onSave: (v: number) => void; currencySymbol?: string; compact?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current ? String(current.toFixed(2)) : "");
  if (!editing) {
    return (
      <Button size="sm" variant="ghost" className={compact ? "h-6 w-6 p-0" : "h-7 text-xs"} onClick={() => setEditing(true)} title="Editar budget diário">
        <DollarSign className="h-3 w-3" />
        {!compact && <span className="ml-1">Budget</span>}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{currencySymbol}/dia</span>
      <Input value={val} onChange={(e) => setVal(e.target.value)} className="h-7 w-20 text-xs bg-background" autoFocus />
      <Button size="sm" className="h-7 text-xs" onClick={() => { const n = parseFloat(val.replace(",", ".")); if (n > 0) { onSave(n); setEditing(false); } }}>OK</Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>X</Button>
    </div>
  );
}