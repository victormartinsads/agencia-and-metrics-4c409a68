import { useState } from "react";
import { Campaign } from "@/data/mockMetaData";
import { motion } from "framer-motion";
import { Image, Video, Layers, ExternalLink, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useCreativeOverrides, applyOverrides } from "@/hooks/useCreativeOverrides";
import { CreativeEditModal } from "@/components/dashboard/CreativeEditModal";

const typeIcon = { image: Image, video: Video, carousel: Layers };
const rankBadge = [
  { label: "🏆 TOP 1", className: "bg-primary text-primary-foreground font-bold" },
  { label: "🥈 TOP 2", className: "bg-primary/80 text-primary-foreground font-bold" },
  { label: "🥉 TOP 3", className: "bg-primary/60 text-primary-foreground font-bold" },
];

const FUNNEL_MAP: [RegExp, string][] = [
  [/CAPTACAO_?(?:DE_)?SEGUIDORES|CAPTAÇÃO_?(?:DE_)?SEGUIDORES/i, "Captação de Seguidores"],
  [/CORREDOR_?JAPONES|CORREDOR_?JAPONÊS/i, "Corredor Japonês"],
  [/CALL_?MENSAGEM_?IG/i, "Call de Vendas | Mensagens"],
  [/CALL_?PC/i, "Call de Vendas | Página de Captura"],
  [/MINI_?TREINAMENTO_?PC/i, "Mini Treinamento | Página de Captura"],
  [/ISCA_?PC/i, "Isca | Página de Captura"],
  [/SERVICOS_?MENSAGENS_?WPP|SERVIÇOS_?MENSAGENS_?WPP/i, "Serviços | Mensagens"],
  [/MEDIUM_?TICKET_?PV/i, "Medium Ticket | Página de Vendas"],
  [/LOW_?TICKET_?PV/i, "Low Ticket | Página de Vendas"],
  [/FORMS_?NATIVO/i, "Formulário Nativo"],
  [/IMERSÃO_?PAGA|IMERSAO_?PAGA/i, "Imersão Paga"],
  [/WORKSHOP/i, "Workshop"],
];

function getFunnelLabel(campaignName: string): string {
  for (const [regex, label] of FUNNEL_MAP) {
    if (regex.test(campaignName)) return `Funil: ${label}`;
  }
  return campaignName;
}

interface Props {
  campaign: Campaign;
  clientId?: string;
  currencySymbol?: string;
}

export function CreativeGrid({ campaign, clientId, currencySymbol = "R$" }: Props) {
  const { data: overrides = [] } = useCreativeOverrides(clientId);
  const [editingCreative, setEditingCreative] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const resultLabel = campaign.primaryResultLabel || "Conversões";

  const sorted = [...campaign.creatives]
    .map((cr) => {
      const ov = applyOverrides(cr.id, {
        conversions: cr.primaryResult ?? cr.conversions,
        spend: cr.spend,
        ctr: cr.ctr,
        impressions: cr.impressions,
        clicks: cr.clicks,
        roas: cr.roas,
      }, overrides);
      return { ...cr, _ov: ov };
    })
    .sort((a, b) => {
      if (b._ov.conversions !== a._ov.conversions) return b._ov.conversions - a._ov.conversions;
      const aCpa = a._ov.conversions > 0 ? a._ov.spend / a._ov.conversions : Infinity;
      const bCpa = b._ov.conversions > 0 ? b._ov.spend / b._ov.conversions : Infinity;
      return aCpa - bCpa;
    });

  const PAGE_SIZE = 3;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const top3Total = sorted.slice(0, 3).reduce((sum, cr) => sum + cr._ov.conversions, 0);
  const remainingResults = Math.max(campaign.conversions - top3Total, 0);

  if (sorted.length === 0) return null;

  const editCreative = sorted.find((s) => s.id === editingCreative);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-border bg-card shadow-sm"
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              {getFunnelLabel(campaign.name)}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Top 3 somam {top3Total} de {campaign.conversions} {resultLabel.toLowerCase()}
              {remainingResults > 0 ? ` • outros criativos: ${remainingResults}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              Métrica: {resultLabel}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-8 w-8 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[11px] text-muted-foreground tabular-nums min-w-[60px] text-center">
                  {safePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="h-8 w-8 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {visible.map((cr, i) => {
            const absoluteRank = safePage * PAGE_SIZE + i;
            const Icon = typeIcon[cr.type];
            const ov = cr._ov;
            const cpa = ov.conversions > 0 ? (ov.spend / ov.conversions) : 0;
            const badge = rankBadge[absoluteRank];
            const hasOverride = overrides.some(o => o.creative_id === cr.id);

            return (
              <motion.div
                key={`${cr.id}-${safePage}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-lg border overflow-hidden transition-shadow group relative ${
                  absoluteRank === 0 ? "border-primary/40 shadow-md" : "border-border hover:shadow-md"
                }`}
              >
                {clientId && (
                  <button
                    onClick={() => setEditingCreative(cr.id)}
                    className="absolute top-2 right-10 z-10 bg-card/80 backdrop-blur-sm rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
                    title="Editar métricas"
                  >
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                  </button>
                )}
                {hasOverride && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">editado</span>
                  </div>
                )}
                <div className="relative aspect-square bg-muted overflow-hidden">
                  <img
                    src={cr.thumbnail}
                    alt={cr.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.dataset.fallbackApplied === "true") return;
                      target.dataset.fallbackApplied = "true";
                      target.src = `https://picsum.photos/seed/${cr.id}/600/600`;
                    }}
                  />
                  {badge ? (
                    <div className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${badge.className}`}>
                      {badge.label}
                    </div>
                  ) : (
                    <div className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm text-card-foreground">
                      #{absoluteRank + 1}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-card/80 backdrop-blur-sm rounded-md p-1.5">
                    <Icon className="h-4 w-4 text-card-foreground/70" />
                  </div>
                </div>
                <div className="p-4 space-y-2.5">
                  <p className="text-sm font-medium text-card-foreground truncate">{cr.name}</p>
                  {cr.permalinkUrl && (
                    <a
                      href={cr.permalinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" /> Ver publicação
                    </a>
                  )}
                  {cr.adsetName && (
                    <p className="text-[10px] text-muted-foreground truncate">Conjunto: {cr.adsetName}</p>
                  )}
                  <div className="space-y-1.5">
                    <div className="bg-primary/10 rounded-md p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{resultLabel}</span>
                      <p className="font-bold text-primary text-base">{ov.conversions}</p>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">CPA</span>
                      <p className="font-semibold text-card-foreground text-sm">
                        {currencySymbol} {cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-muted/30 rounded p-1.5">
                        <span className="text-muted-foreground">Invest.</span>
                        <p className="font-semibold text-card-foreground">{currencySymbol} {ov.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <span className="text-muted-foreground">CTR</span>
                        <p className="font-semibold text-card-foreground">{ov.ctr}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {editCreative && clientId && (
        <CreativeEditModal
          open={!!editingCreative}
          onOpenChange={(open) => !open && setEditingCreative(null)}
          clientId={clientId}
          creativeId={editCreative.id}
          creativeName={editCreative.name}
          existingOverrides={overrides}
          metrics={[
            { key: "conversions", label: resultLabel, original: editCreative.primaryResult ?? editCreative.conversions },
            { key: "spend", label: "Investimento", original: editCreative.spend },
            { key: "ctr", label: "CTR (%)", original: editCreative.ctr },
            { key: "impressions", label: "Impressões", original: editCreative.impressions },
            { key: "clicks", label: "Cliques", original: editCreative.clicks },
            { key: "roas", label: "ROAS", original: editCreative.roas },
          ]}
        />
      )}
    </>
  );
}
