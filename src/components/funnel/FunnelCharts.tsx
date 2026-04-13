import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { Campaign, DailyMetric } from "@/data/mockMetaData";
import { FunnelCampaign } from "@/hooks/useFunnelAnalysis";

// 1. Bar chart: Campaigns vs ROAS
export function CampaignRoasChart({ campaigns }: { campaigns: FunnelCampaign[] }) {
  const data = campaigns
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 10)
    .map((c) => ({
      name: c.name.length > 25 ? c.name.slice(0, 25) + "…" : c.name,
      roas: c.roas,
      spend: c.spend,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Campanhas vs ROAS</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(val: number) => [`${val}x`, "ROAS"]}
            />
            <Bar dataKey="roas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 2. Line chart: Daily evolution
export function DailyEvolutionChart({ dailyMetrics }: { dailyMetrics: DailyMetric[] }) {
  const data = dailyMetrics.map((d) => ({
    ...d,
    cpa: d.conversions > 0 ? Number((d.spend / d.conversions).toFixed(2)) : 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Evolução Diária</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="spend" stroke="hsl(var(--primary))" strokeWidth={2} name="Investimento (R$)" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="hsl(var(--meta-green))" strokeWidth={2} name="Conversões" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="cpa" stroke="hsl(var(--meta-orange))" strokeWidth={2} name="CPA (R$)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 3. Scatter chart: CTR vs CPA
export function CtrCpaScatter({ campaigns }: { campaigns: Campaign[] }) {
  const data = campaigns
    .filter((c) => c.spend > 0 && c.costPerConversion > 0)
    .map((c) => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
      ctr: c.ctr,
      cpa: c.costPerConversion,
      spend: c.spend,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">CTR vs CPA</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="ctr" name="CTR (%)" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "CTR (%)", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis dataKey="cpa" name="CPA (R$)" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} label={{ value: "CPA (R$)", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <ZAxis dataKey="spend" range={[50, 400]} name="Investimento" />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(val: number, name: string) => [name === "CTR (%)" ? `${val}%` : `R$ ${val.toFixed(2)}`, name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
            />
            <Scatter data={data} fill="hsl(var(--primary))" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
