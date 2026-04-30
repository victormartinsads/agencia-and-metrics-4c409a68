import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campaign } from "@/data/mockMetaData";
import { FunnelDetailView } from "./FunnelDetailView";

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: string;
  funnelCode: string;
  funnelLabel: string;
  campaigns: Campaign[];
  currencySymbol: string;
}

export function FunnelDetailDialog({
  open,
  onClose,
  clientId,
  funnelCode,
  funnelLabel,
  campaigns,
  currencySymbol,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{funnelLabel}</DialogTitle>
        </DialogHeader>
        <FunnelDetailView
          clientId={clientId}
          funnelCode={funnelCode}
          funnelLabel={funnelLabel}
          campaigns={campaigns}
          currencySymbol={currencySymbol}
        />
      </DialogContent>
    </Dialog>
  );
}