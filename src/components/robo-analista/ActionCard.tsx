import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, PauseCircle, CheckCircle2, PlayCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type AlertType = "danger" | "warning" | "success" | "info";
export type SuggestedAction = "pause" | "scale" | "observe" | "activate";

export interface ActionAlert {
  id: string;
  clientName: string;
  campaignName: string;
  assetName: string; // Ad set or Ad name
  assetType: "Campanha" | "Conjunto" | "Criativo";
  type: AlertType;
  message: string;
  metrics: {
    spend: number;
    cpa?: number;
    cpl?: number;
    roas?: number;
    leads?: number;
    purchases?: number;
  };
  suggestedAction: SuggestedAction;
  timestamp: string;
}

interface ActionCardProps {
  alert: ActionAlert;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ActionCard({ alert, onApprove, onReject }: ActionCardProps) {
  const getIcon = () => {
    switch (alert.type) {
      case "danger": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning": return <TrendingDown className="w-5 h-5 text-amber-500" />;
      case "success": return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (alert.type) {
      case "danger": return "border-destructive/50 shadow-sm shadow-destructive/10";
      case "warning": return "border-amber-500/50 shadow-sm shadow-amber-500/10";
      case "success": return "border-emerald-500/50 shadow-sm shadow-emerald-500/10";
      default: return "border-blue-500/50 shadow-sm shadow-blue-500/10";
    }
  };

  const getActionText = () => {
    switch (alert.suggestedAction) {
      case "pause": return "Pausar Agora";
      case "scale": return "Aumentar Verba (+20%)";
      case "activate": return "Ativar";
      default: return "Ciente";
    }
  };

  const getActionIcon = () => {
    switch (alert.suggestedAction) {
      case "pause": return <PauseCircle className="w-4 h-4 mr-2" />;
      case "scale": return <TrendingUp className="w-4 h-4 mr-2" />;
      case "activate": return <PlayCircle className="w-4 h-4 mr-2" />;
      default: return <CheckCircle2 className="w-4 h-4 mr-2" />;
    }
  };

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-md ${getBorderColor()}`}>
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent to-transparent" 
           style={{ backgroundColor: alert.type === 'danger' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : alert.type === 'success' ? '#10b981' : '#3b82f6' }} />
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <div className="mt-1">{getIcon()}</div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{alert.clientName}</span>
                <span className="text-muted-foreground text-xs">•</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {alert.assetType}
                </Badge>
              </div>
              <h3 className="font-medium text-base leading-tight mb-1">
                {alert.assetName}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-[300px]" title={alert.campaignName}>
                em {alert.campaignName}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{alert.timestamp}</span>
        </div>
      </CardHeader>
      
      <CardContent className="px-5 pb-4">
        <div className="bg-muted/40 p-3 rounded-md mb-4 border border-border/50">
          <p className="text-sm font-medium">{alert.message}</p>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Gasto</span>
            <span className="font-semibold">R$ {alert.metrics.spend.toFixed(2)}</span>
          </div>
          {alert.metrics.cpa !== undefined && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">CPA</span>
              <span className={`font-semibold ${alert.type === 'danger' ? 'text-destructive' : ''}`}>
                R$ {alert.metrics.cpa.toFixed(2)}
              </span>
            </div>
          )}
          {alert.metrics.cpl !== undefined && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">CPL</span>
              <span className={`font-semibold ${alert.type === 'danger' ? 'text-destructive' : ''}`}>
                R$ {alert.metrics.cpl.toFixed(2)}
              </span>
            </div>
          )}
          {alert.metrics.purchases !== undefined && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Vendas</span>
              <span className="font-semibold">{alert.metrics.purchases}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="px-5 py-3 bg-muted/20 border-t flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onReject(alert.id)}>
          Ignorar
        </Button>
        <Button 
          size="sm" 
          variant={alert.type === 'danger' ? 'destructive' : alert.type === 'success' ? 'default' : 'secondary'}
          onClick={() => onApprove(alert.id)}
          className={alert.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
        >
          {getActionIcon()}
          {getActionText()}
        </Button>
      </CardFooter>
    </Card>
  );
}
