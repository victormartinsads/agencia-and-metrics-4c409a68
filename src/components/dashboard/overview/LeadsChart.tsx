import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
} from "recharts";

interface Props {
  data: { date: string; leads: number }[];
}

function fmtDate(s: string) {
  if (!s) return "";
  if (s.includes("/") && s.length === 5) return s;
  const parts = s.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function LeadsChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
        Sem dados de leads
      </div>
    );
  }
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 15, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
              color: "#fff",
            }}
          />
          <Line dataKey="leads" name="Leads" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }}>
            <LabelList dataKey="leads" position="top" fontSize={9} fill="hsl(var(--primary))" />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}