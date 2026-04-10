import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  delay?: number;
}

export function KpiCard({ title, value, change, changeType = "neutral", icon: Icon, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <div className="text-2xl font-bold text-card-foreground">{value}</div>
      {change && (
        <span className={`text-xs font-medium mt-1 inline-block ${
          changeType === "positive" ? "text-meta-green" :
          changeType === "negative" ? "text-meta-red" : "text-muted-foreground"
        }`}>
          {change}
        </span>
      )}
    </motion.div>
  );
}
