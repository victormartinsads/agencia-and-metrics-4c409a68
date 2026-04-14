import { motion } from "framer-motion";
import { Creative } from "@/data/mockMetaData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreativeWithCampaign extends Creative {
  campaignName: string;
}

interface Props {
  byCPA: CreativeWithCampaign[];
  byCTR: CreativeWithCampaign[];
  byConversions: CreativeWithCampaign[];
}

function PodiumCard({ creative, rank, metric, metricLabel }: { creative: CreativeWithCampaign; rank: number; metric: string; metricLabel: string }) {
  const heights = ["h-36", "h-28", "h-24"];
  const colors = ["border-yellow-500/50 bg-yellow-500/10", "border-muted bg-muted/30", "border-orange-700/50 bg-orange-700/10"];
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`flex flex-col items-center gap-2 ${rank === 0 ? "order-2" : rank === 1 ? "order-1 mt-4" : "order-3 mt-6"}`}
    >
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
        <p className="text-xs font-medium text-card-foreground truncate max-w-[120px]">{creative.name}</p>
        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{creative.campaignName}</p>
        <p className="text-sm font-bold text-primary mt-1">{metric}</p>
        <p className="text-[10px] text-muted-foreground">{metricLabel}</p>
      </div>
    </motion.div>
  );
}

export function CreativePodium({ byCPA, byCTR, byConversions }: Props) {
  const renderPodium = (items: CreativeWithCampaign[], metricFn: (c: CreativeWithCampaign) => string, label: string) => {
    if (items.length === 0) return <p className="text-center text-muted-foreground text-sm py-8">Sem criativos com dados suficientes</p>;
    return (
      <div className="flex justify-center gap-6 py-4">
        {items.slice(0, 3).map((c, i) => (
          <PodiumCard key={c.id} creative={c} rank={i} metric={metricFn(c)} metricLabel={label} />
        ))}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <h3 className="text-lg font-bold text-card-foreground">🏅 Pódio de Criativos</h3>
      <div className="rounded-xl border border-border bg-card p-4">
        <Tabs defaultValue="cpa">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="cpa">Menor CPA</TabsTrigger>
            <TabsTrigger value="ctr">Maior CTR</TabsTrigger>
            <TabsTrigger value="conv">Mais Conversões</TabsTrigger>
          </TabsList>
          <TabsContent value="cpa">
            {renderPodium(byCPA, c => `R$ ${(c.spend / c.conversions).toFixed(2)}`, "CPA")}
          </TabsContent>
          <TabsContent value="ctr">
            {renderPodium(byCTR, c => `${c.ctr.toFixed(2)}%`, "CTR")}
          </TabsContent>
          <TabsContent value="conv">
            {renderPodium(byConversions, c => `${c.conversions}`, "Conversões")}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
