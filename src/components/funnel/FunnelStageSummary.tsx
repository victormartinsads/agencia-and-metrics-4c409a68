import { motion } from "framer-motion";
import { FunnelCampaign, FunnelStage } from "@/hooks/useFunnelAnalysis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGE_CONFIG: Record<FunnelStage, { label: string; color: string; emoji: string }> = {
  topo: { label: "Topo de Funil", color: "border-blue-500/30 bg-blue-500/5", emoji: "🔵" },
  meio: { label: "Meio de Funil", color: "border-cyan-500/30 bg-cyan-500/5", emoji: "🟢" },
  fundo: { label: "Fundo de Funil", color: "border-primary/30 bg-primary/5", emoji: "🟡" },
};

interface Props {
  topo: FunnelCampaign[];
  meio: FunnelCampaign[];
  fundo: FunnelCampaign[];
  onOverride?: (campaignId: string, stage: FunnelStage) => void;
}

function StageCard({ stage, campaigns, onOverride }: {
  stage: FunnelStage;
  campaigns: FunnelCampaign[];
  onOverride?: (campaignId: string, stage: FunnelStage) => void;
}) {
  const config = STAGE_CONFIG[stage];
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const active = campaigns.filter((c) => c.spend > 0);

  return (
    <div className={`rounded-xl border ${config.color} shadow-sm overflow-hidden`}>
      <div className="p-4 border-b border-border">
        <h4 className="text-sm font-semibold text-card-foreground">
          {config.emoji} {config.label}
        </h4>
        <div className="flex gap-4 mt-1">
          <span className="text-[10px] text-muted-foreground">{campaigns.length} campanha(s)</span>
          <span className="text-[10px] text-muted-foreground">R$ {totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="p-3 space-y-1.5 max-h-[250px] overflow-y-auto">
        {campaigns.length > 0 ? campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50">
            <div className="flex-1 min-w-0 mr-2">
              <p className="text-[11px] font-medium text-card-foreground truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">R$ {c.spend.toFixed(2)} • CTR {c.ctr}%</p>
            </div>
            {onOverride && (
              <Select
                value={c.funnelStage}
                onValueChange={(val) => onOverride(c.id, val as FunnelStage)}
              >
                <SelectTrigger className="h-6 w-[90px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="topo" className="text-[11px]">Topo</SelectItem>
                  <SelectItem value="meio" className="text-[11px]">Meio</SelectItem>
                  <SelectItem value="fundo" className="text-[11px]">Fundo</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )) : (
          <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma campanha</p>
        )}
      </div>
    </div>
  );
}

export function FunnelStageSummary({ topo, meio, fundo, onOverride }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <StageCard stage="topo" campaigns={topo} onOverride={onOverride} />
      <StageCard stage="meio" campaigns={meio} onOverride={onOverride} />
      <StageCard stage="fundo" campaigns={fundo} onOverride={onOverride} />
    </div>
  );
}
