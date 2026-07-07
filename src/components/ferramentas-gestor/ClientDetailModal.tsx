import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ExternalLink,
  Eye,
  RefreshCw,
  Copy,
  Zap,
  Tag,
  Trash2,
  Pencil,
  FileText,
  Plus,
  Loader2,
  DollarSign,
  Wallet,
  StickyNote,
  Link2,
  ClipboardList,
} from "lucide-react";
import { Client } from "@/hooks/useClients";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client | null;
  metaData: any;
  accountStatus: any;
  isLoadingMeta: boolean;
  isLoadingStatus: boolean;
  onOpenEditor: () => void;
  onRefreshStatus: () => void;
}

function fmtMoney(v: number, symbol = "R$") {
  return `${symbol} ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ClientDetailModal({
  open,
  onOpenChange,
  client,
  metaData,
  accountStatus,
  isLoadingMeta,
  isLoadingStatus,
  onOpenEditor,
  onRefreshStatus,
}: Props) {
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  // Persist notes per client in localStorage
  const notesKey = client ? `client_notes:${client.id}` : null;

  useEffect(() => {
    if (notesKey) {
      setNotes(localStorage.getItem(notesKey) || "");
    }
  }, [notesKey]);

  const saveNotes = () => {
    if (notesKey) {
      localStorage.setItem(notesKey, notes);
      setEditingNotes(false);
      toast.success("Observações salvas!");
    }
  };

  if (!client) return null;

  const adAccountId = client.ad_account_ids?.[0] || null;
  const actId = adAccountId?.replace("act_", "") || "";

  // Metrics
  const totalSpend: number = metaData?.overviewMetrics?.totalSpend || 0;
  const campaigns: any[] = metaData?.campaigns || [];
  const activeCampaigns = campaigns.filter(
    (c) => c.status === "active" || c.status === "ACTIVE"
  );

  // Balance
  const balance: number = accountStatus?.balance ?? 0;
  const currency = accountStatus?.currency || client.currency_symbol || "R$";
  const accountOk = balance >= 0;
  const spendCap: number = accountStatus?.spend_cap || 0;

  // Estimate days remaining based on daily spend
  const dailySpend = totalSpend / 7; // default 7-day average
  const daysRemaining = dailySpend > 0 ? Math.floor(balance / dailySpend) : 0;

  const adsManagerUrl = adAccountId
    ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${actId}`
    : "https://adsmanager.facebook.com";

  const billingUrl = adAccountId
    ? `https://adsmanager.facebook.com/adsmanager/manage/billing?act=${actId}`
    : "https://adsmanager.facebook.com";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado!`));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl text-slate-100">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-sm font-black uppercase tracking-tight text-slate-100 truncate pr-4">
                {client.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  className={`text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${
                    activeCampaigns.length > 0
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                  }`}
                >
                  {activeCampaigns.length > 0
                    ? `${activeCampaigns.length} campanha${activeCampaigns.length > 1 ? "s ativas" : " ativa"}`
                    : "Nenhuma campanha ativa"}
                </Badge>
                <Badge
                  className={`text-[10px] font-bold border rounded-full px-2.5 py-0.5 ${
                    accountOk
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {accountOk ? "Saldo OK" : "Saldo Crítico"}
                </Badge>
                {adAccountId && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {adAccountId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 grid grid-cols-2 gap-3">
          {/* Card: INVESTIMENTO */}
          <div className="col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Investimento
            </div>
            {isLoadingMeta ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <>
                <p className="text-xl font-black text-slate-100 tabular-nums">
                  {fmtMoney(totalSpend)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Ritmo:{" "}
                  <span className="font-semibold text-slate-300">
                    {fmtMoney(dailySpend)}/dia
                  </span>
                </p>
              </>
            )}
          </div>

          {/* Card: SALDO META ADS */}
          <div className="col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <Wallet className="h-3 w-3" /> Saldo Meta Ads
              </div>
              <button
                onClick={onRefreshStatus}
                className="text-muted-foreground hover:text-slate-300 transition"
                title="Atualizar saldo"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingStatus ? "animate-spin" : ""}`} />
              </button>
            </div>
            {isLoadingStatus ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <>
                <p
                  className={`text-xl font-black tabular-nums ${
                    accountOk ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtMoney(balance)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {daysRemaining > 0 ? `~${daysRemaining}d restantes` : "Saldo insuficiente"}
                  {spendCap > 0 && (
                    <span className="ml-1">· Limite {fmtMoney(spendCap)}</span>
                  )}
                </p>
              </>
            )}
          </div>

          {/* Card: OBSERVAÇÕES */}
          <div className="col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <StickyNote className="h-3 w-3" /> Observações
              </div>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-[10px] text-primary hover:text-primary/80 font-semibold transition"
                >
                  Editar
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva observações internas sobre este cliente..."
                  className="text-xs h-20 bg-black/30 border-white/10 text-slate-100 resize-none focus-visible:ring-primary/40"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={saveNotes}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setEditingNotes(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic min-h-[40px]">
                {notes || "Nenhuma observação cadastrada."}
              </p>
            )}
          </div>

          {/* Card: ACESSO RÁPIDO */}
          <div className="col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              <Link2 className="h-3 w-3" /> Acesso Rápido
            </div>
            <div className="space-y-2">
              <a
                href={adsManagerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between group p-2 rounded-lg hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-[#1877f2]/10 flex items-center justify-center">
                    <span className="text-[10px] font-black text-[#1877f2]">f</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition">
                    Gerenciador de anúncios
                  </span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-slate-300 transition" />
              </a>
              <a
                href={billingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between group p-2 rounded-lg hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition">
                    Pagamentos e cobrança
                  </span>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-slate-300 transition" />
              </a>
              {adAccountId && (
                <button
                  onClick={() => copyToClipboard(adAccountId, "ID da conta")}
                  className="flex items-center justify-between w-full group p-2 rounded-lg hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                      <Copy className="h-3 w-3 text-violet-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition truncate max-w-[120px]">
                      {adAccountId}
                    </span>
                  </div>
                  <Copy className="h-3 w-3 text-muted-foreground group-hover:text-slate-300 transition shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Card: RELATÓRIOS RECENTES */}
          <div className="col-span-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <ClipboardList className="h-3 w-3" /> Relatórios Recentes
              </div>
              <button className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-bold transition">
                <Plus className="h-3 w-3" /> Gerar
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { label: `${client.name.slice(0, 18)}... · ${new Date().toLocaleDateString("pt-BR")}`, type: "PDF" },
              ].map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-slate-300 font-medium truncate">
                      {r.label}
                    </span>
                  </div>
                  <Badge className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 shrink-0 ml-1">
                    {r.type}
                  </Badge>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic text-center py-2">
                Nenhum relatório gerado ainda.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-slate-300"
            >
              <Zap className="h-3 w-3" /> Automações
              <span className="text-[9px] text-muted-foreground/60">(Nenhuma)</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-slate-300"
            >
              <Tag className="h-3 w-3" /> Tags
              <Plus className="h-2.5 w-2.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-slate-300"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-[#b5f23d] hover:bg-[#c5ff55] text-black font-black shadow-lg shadow-[#b5f23d]/20 transition"
              onClick={() => {
                onOpenChange(false);
                onOpenEditor();
              }}
            >
              <Eye className="h-3.5 w-3.5" /> Visão Editor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
