import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface Point {
  date: string;
  revenue: number;
  sales: number;
}

interface Props {
  data: Point[];
  currencySymbol: string;
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return n.toString();
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function RevenueSalesChart({ data, currencySymbol }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickFormatter={fmtShort}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) =>
              name === "Faturamento" ? formatCurrency(value, currencySymbol) : value
            }
            labelFormatter={fmtDate}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="rect" />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name="Faturamento"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
          >
            <LabelList dataKey="revenue" position="top" formatter={(v: number) => fmtShort(v)} fontSize={9} fill="hsl(var(--primary))" />
          </Line>
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sales"
            name="Vendas Realizadas"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}