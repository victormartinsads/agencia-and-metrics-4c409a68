import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { dailyMetrics } from "@/data/mockMetaData";

export function SpendChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Investimento Diário (R$)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={dailyMetrics}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(214, 89%, 52%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(214, 89%, 52%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 15%, 90%)", fontSize: 13 }}
            formatter={(v: number) => [`R$ ${v}`, "Investimento"]}
          />
          <Area type="monotone" dataKey="spend" stroke="hsl(214, 89%, 52%)" fill="url(#spendGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConversionsChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground mb-4">Conversões Diárias</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dailyMetrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 15%, 90%)", fontSize: 13 }}
          />
          <Bar dataKey="conversions" fill="hsl(152, 69%, 41%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
