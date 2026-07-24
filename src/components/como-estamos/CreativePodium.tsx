import { useState } from "react";
import { motion } from "framer-motion";
import { Creative } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil } from "lucide-react";
import { useCreativeOverrides, applyOverrides } from "@/hooks/useCreativeOverrides";
import { CreativeEditModal } from "@/components/dashboard/CreativeEditModal";

interface CreativeWithCampaign extends Creative {
  campaignName: string;
}

interface Props {
  byCPA: CreativeWithCampaign[];
  byCTR: CreativeWithCampaign[];
  byConversions: CreativeWithCampaign[];
  clientId?: string;
  currencySymbol?: string;
}

function PodiumCard({ creative, rank, metric, metricLabel, onEdit, hasOverride }: {
  creative: CreativeWithCampaign;
  rank: number;
  metric: string;
  metricLabel: string;
  onEdit?: () => void;
  hasOverride?: boolean;
}) {
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`flex flex-col items-center gap-2 relative group ${rank === 0 ? "order-2" : rank === 1 ? "order-1 mt-4" : "order-3 mt-6"}`}
    >
      {hasOverride && (
        <span className="absolute -top-1 -left-1 z-10 text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">editado</span>
      )}
      <div className="relative">
        <img
          src={creative.thumbnail}
          alt={creative.name}
          className="w-20 h-20 rounded-lg object-cover border-2 border-border"
          loading="lazy"
        />
        <span className="absolute -top-2 -right-2 text-xl">{medals[rank]}</span>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-card-foreground truncate max-w-[120px]">
          {localStorage.getItem(`creative_name_${creative.id}`) || creative.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{creative.campaignName}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <p className="text-sm font-bold text-primary">{metric}</p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-0.5 rounded text-primary hover:bg-primary/20 transition-colors"
              title="Editar resultado do criativo"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{metricLabel}</p>
      </div>
    </motion.div>
  );
}

export function CreativePodium({ byCPA, byCTR, byConversions, clientId, currencySymbol = "R$" }: Props) {
  const { data: overrides = [] } = useCreativeOverrides(clientId);
  const [editingCreative, setEditingCreative] = useState<CreativeWithCampaign | null>(null);

  const getOv = (c: CreativeWithCampaign) => applyOverrides(c.id, {
    conversions: c.conversions,
    spend: c.spend,
    ctr: c.ctr,
    impressions: c.impressions,
    clicks: c.clicks,
    roas: c.roas,
  }, overrides);

  const renderPodium = (items: CreativeWithCampaign[], metricFn: (c: CreativeWithCampaign) => string, label: string) => {
    if (items.length === 0) return <p className="text-center text-muted-foreground text-sm py-8">Sem criativos com dados suficientes</p>;
    return (
      <div className="flex justify-center gap-6 py-4">
        {items.slice(0, 3).map((c, i) => {
          const hasOv = overrides.some(o => o.creative_id === c.id);
          return (
            <PodiumCard
              key={c.id}
              creative={c}
              rank={i}
              metric={metricFn(c)}
              metricLabel={label}
              onEdit={clientId ? () => setEditingCreative(c) : undefined}
              hasOverride={hasOv}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <h3
          className="text-lg font-bold text-card-foreground"
          style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
        >
          🏅 Pódio de Criativos
        </h3>
        <div className="rounded-2xl border border-border/60 bg-card p-4 relative overflow-hidden">
          <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <Tabs defaultValue="cpa">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="cpa">Menor CPA</TabsTrigger>
              <TabsTrigger value="ctr">Maior CTR</TabsTrigger>
              <TabsTrigger value="conv">Mais Conversões</TabsTrigger>
            </TabsList>
            <TabsContent value="cpa">
              {renderPodium(byCPA, c => {
                const ov = getOv(c);
                const cpa = ov.conversions > 0 ? ov.spend / ov.conversions : 0;
                return `${currencySymbol} ${cpa.toFixed(2)}`;
              }, "CPA")}
            </TabsContent>
            <TabsContent value="ctr">
              {renderPodium(byCTR, c => `${getOv(c).ctr.toFixed(2)}%`, "CTR")}
            </TabsContent>
            <TabsContent value="conv">
              {renderPodium(byConversions, c => `${getOv(c).conversions}`, "Conversões")}
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {editingCreative && clientId && (
        <CreativeEditModal
          open={!!editingCreative}
          onOpenChange={(open) => !open && setEditingCreative(null)}
          clientId={clientId}
          creativeId={editingCreative.id}
          creativeName={editingCreative.name}
          existingOverrides={overrides}
          metrics={[
            { key: "conversions", label: "Conversões", original: editingCreative.conversions },
            { key: "cpa", label: "CPA (Custo por Resultado)", original: editingCreative.conversions > 0 ? Number((editingCreative.spend / editingCreative.conversions).toFixed(2)) : 0 },
            { key: "spend", label: "Investimento", original: editingCreative.spend },
          ]}
        />
      )}
    </>
  );
}
