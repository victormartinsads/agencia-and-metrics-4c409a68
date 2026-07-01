import React from 'react';
import { Client, Funnel } from '../../../data/mockCampaigns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Users } from 'lucide-react';

interface FunnelSelectorProps {
  clients: Client[];
  funnels: Funnel[];
  selectedClientId: string;
  selectedFunnelId: string;
  onClientChange: (clientId: string) => void;
  onFunnelChange: (funnelId: string) => void;
}

export function FunnelSelector({
  clients,
  funnels,
  selectedClientId,
  selectedFunnelId,
  onClientChange,
  onFunnelChange
}: FunnelSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-card px-4 py-2 rounded-xl border shadow-sm">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedClientId} onValueChange={onClientChange}>
          <SelectTrigger className="w-[200px] h-8 text-sm border-none shadow-none focus:ring-0 bg-transparent">
            <SelectValue placeholder="Selecione o Cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border"></div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedFunnelId} onValueChange={onFunnelChange}>
          <SelectTrigger className="w-[250px] h-8 text-sm border-none shadow-none focus:ring-0 bg-transparent font-medium text-primary">
            <SelectValue placeholder="Selecione o Funil" />
          </SelectTrigger>
          <SelectContent>
            {funnels.length === 0 ? (
              <SelectItem value="empty" disabled>Nenhum funil encontrado</SelectItem>
            ) : (
              funnels.map(funnel => (
                <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
