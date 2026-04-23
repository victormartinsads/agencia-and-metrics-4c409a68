import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

interface Props {
  data: { product: string; sales: number }[];
}

export function ProductSalesChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
        Sem dados de produto
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="product"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="sales" position="right" fontSize={10} fill="hsl(var(--primary))" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}