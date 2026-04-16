import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  clientId: string;
  totalSpend: number;
  currentRevenue?: number;
  currencySymbol?: string;
}

export function RevenueRoasCard({ clientId, totalSpend, currentRevenue = 0, currencySymbol = "R$" }: Props) {
  const [revenue, setRevenue] = useState(currentRevenue);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRevenue(currentRevenue);
  }, [currentRevenue]);

  const roas = totalSpend > 0 ? revenue / totalSpend : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ monthly_revenue: revenue })
        .eq("id", clientId);
      if (error) throw error;
      toast.success("Faturamento salvo!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const roasColor = roas >= 3 ? "text-green-400" : roas >= 1 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Faturamento & ROAS
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Faturamento Mensal</label>
            <div className="flex gap-1 mt-1">
              <Input
                type="number"
                value={revenue || ""}
                onChange={e => setRevenue(Number(e.target.value))}
                placeholder="0.00"
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-8 px-2">
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="text-center">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Investimento</label>
            <p className="text-lg font-bold text-card-foreground mt-1">
              {currencySymbol} {totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wide">ROAS Geral</label>
            <p className={`text-2xl font-bold mt-1 flex items-center justify-center gap-1 ${roasColor}`}>
              <TrendingUp className="h-5 w-5" />
              {roas.toFixed(2)}x
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
